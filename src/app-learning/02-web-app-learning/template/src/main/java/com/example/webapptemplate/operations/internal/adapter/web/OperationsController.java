package com.example.webapptemplate.operations.internal.adapter.web;

import com.example.webapptemplate.platform.*;
import com.example.webapptemplate.settings.FeaturePolicy;
import com.example.webapptemplate.operations.internal.adapter.persistence.RecoveryService;
import java.time.OffsetDateTime;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.http.*;
import org.springframework.core.io.FileSystemResource;

@Controller
public class OperationsController {
    private final JdbcTemplate jdbc;
    private final ImageStore storage;
    private final ImageCleanup cleanup;
    private final RuntimeInfo runtime;
    private final FeaturePolicy policy;
    private final AuditTrail audit;
    private final RecoveryService recovery;
    public OperationsController(JdbcTemplate jdbc,ImageStore storage,ImageCleanup cleanup,RuntimeInfo runtime,FeaturePolicy policy,AuditTrail audit,RecoveryService recovery) {
        this.jdbc=jdbc; this.storage=storage; this.cleanup=cleanup; this.runtime=runtime; this.policy=policy; this.audit=audit; this.recovery=recovery;
    }
    public record Check(String label,String state,String next) {}
    @GetMapping("/admin/operations")
    public String show(Model model) {
        var checks=new ArrayList<Check>();
        model.addAttribute("runtime",runtime); model.addAttribute("checkedAt",OffsetDateTime.now().toString());
        try {
            String schema=jdbc.queryForObject("select current_schema()",String.class);
            checks.add(new Check("データベース",schema.equals(runtime.schema())?"正常":"接続先不一致","スキーマ："+schema));
            checks.add(new Check("画像投稿",policy.imagesEnabled()?"許可":"禁止","投稿の添付許可とストレージ接続状態は別です。"));
            model.addAttribute("pending",cleanup.pending());
            model.addAttribute("events",jdbc.queryForList("select id,operation,result,reference,created_at from operation_events order by created_at desc limit 30"));
        } catch(RuntimeException failure) {
            checks.add(new Check("データベース","接続失敗","提供者に接続設定の確認を依頼し、再確認してください。"));
            model.addAttribute("pending",-1); model.addAttribute("events",List.of());
        }
        if(!storage.configured()) checks.add(new Check("画像ストレージ","未設定","提供者が接続情報を設定してください。"));
        else {
            try { storage.check(); checks.add(new Check("画像ストレージ","正常","保存済み画像の確認は下の整合性確認で実行できます。")); }
            catch(RuntimeException failure) { checks.add(new Check("画像ストレージ","接続失敗","提供者が接続情報・バケットを確認した後、再確認してください。")); }
        }
        model.addAttribute("checks",checks); return "admin/operations";
    }
    @PostMapping("/admin/operations/cleanup")
    public String cleanup(RedirectAttributes flash) {
        try { int pending=cleanup.run(); flash.addFlashAttribute("message","後片付けを再試行しました。保留："+pending+"件"); audit.record("images.cleanup",pending==0?"success":"pending",null); }
        catch(RuntimeException failure) { flash.addFlashAttribute("error","後片付けに接続できませんでした。接続状態を確認して再試行してください。"); audit.record("images.cleanup","failure",null); }
        return "redirect:/admin/operations";
    }
    @PostMapping("/admin/operations/images")
    public String images(Model model) {
        var results=new ArrayList<Check>();
        try {
            for(var row:jdbc.queryForList("select id::text as id,image_bucket,image_key from posts where image_key is not null union all select user_id::text,image_bucket,image_key from user_icons")) {
                String state="正常";
                try { storage.download(row.get("image_bucket").toString(),row.get("image_key").toString()); }
                catch(MissingImage missing) { state="元画像なし"; }
                catch(RuntimeException failure) { state="取得失敗"; }
                results.add(new Check(row.get("id").toString(),state,state.equals("元画像なし")?"元ファイルを再アップロードしてください。":"接続失敗時はストレージの状態を確認してください。"));
            }
        } catch(RuntimeException failure) { results.add(new Check("画像情報","照会失敗","DB接続を確認してください。")); }
        model.addAttribute("imageChecks",results); audit.record("images.verify","checked",null); return show(model);
    }
    @PostMapping("/admin/operations/backup")
    public ResponseEntity<?> backup() {
        try {
            var file=recovery.backup(); audit.record("backup.create","success",null);
            return ResponseEntity.ok().cacheControl(CacheControl.noStore()).header("Content-Disposition","attachment; filename=\""+file.getFileName()+"\"")
                .contentType(MediaType.APPLICATION_OCTET_STREAM).body(new FileSystemResource(file));
        } catch(RuntimeException failure) {
            audit.record("backup.create","failure",null);
            return ResponseEntity.status(503).contentType(MediaType.TEXT_PLAIN).body("バックアップを作成できませんでした。DB・画像の接続を確認してください。欠損画像がある場合は先に復旧してください。");
        }
    }
}
