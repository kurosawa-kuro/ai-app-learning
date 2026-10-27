package com.example.webapptemplate.ai.internal.adapter.web;
import com.example.webapptemplate.ai.*;
import com.example.webapptemplate.platform.Uploads;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Keep only the last draft in this browser session. Restart/session expiry discards it. */
@RestController
@RequestMapping("/ai/drafts")
public class DraftController {
 private static final String LAST="last-ai-draft";
 private final AiDrafts drafts;
 public DraftController(AiDrafts drafts) { this.drafts=drafts; }
 @PostMapping public ResponseEntity<?> generate(@RequestParam UUID requestId,@RequestParam String input,
       @RequestParam(required=false) MultipartFile image,HttpSession session) {
  synchronized(session) {
   var last=(AiDraftResult)session.getAttribute(LAST);
   if(last!=null && last.requestId().equals(requestId)) return ok(last);
   if(last!=null && last.state().equals("RUNNING")) return ResponseEntity.status(409).body(Map.of("message","生成中です。完了を待ってください。"));
   session.setAttribute(LAST,new AiDraftResult(requestId,"RUNNING","","","生成中です。"));
  }
  AiDraftResult result;
  try { result=drafts.generate(requestId,input,Uploads.from(image)); }
  catch(IllegalArgumentException invalid) { result=new AiDraftResult(requestId,"INVALID","","",invalid.getMessage()); }
  catch(Exception unavailable) { result=new AiDraftResult(requestId,"UNKNOWN","","","通信に失敗しました。自動再送はしません。再実行すると料金が発生する場合があります。"); }
  synchronized(session) { session.setAttribute(LAST,result); }
  return ok(result);
 }
 @GetMapping("/{id}") public ResponseEntity<?> find(@PathVariable UUID id,HttpSession session) {
  synchronized(session) {
   var last=(AiDraftResult)session.getAttribute(LAST);
   return last!=null && last.requestId().equals(id) ? ok(last)
    : ResponseEntity.status(404).body(Map.of("message","このブラウザーに結果は残っていません。再起動・セッション終了で下書きは消えます。"));
  }
 }
 private ResponseEntity<AiDraftResult> ok(AiDraftResult result) { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result); }
}
