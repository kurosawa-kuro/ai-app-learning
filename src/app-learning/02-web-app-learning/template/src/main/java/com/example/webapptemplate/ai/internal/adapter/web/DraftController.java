package com.example.webapptemplate.ai.internal.adapter.web;
import com.example.webapptemplate.ai.*;
import com.example.webapptemplate.platform.ImageUpload;
import jakarta.servlet.http.HttpSession;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
@RestController
@RequestMapping("/ai/drafts")
public class DraftController {
 private final AiDrafts drafts;
 public DraftController(AiDrafts drafts) { this.drafts=drafts; }
 private String owner(HttpSession session) {
  synchronized(session) {
   if(session.getAttribute("ai-draft-owner")==null) session.setAttribute("ai-draft-owner",UUID.randomUUID().toString());
   return (String)session.getAttribute("ai-draft-owner");
  }
 }
 @PostMapping public ResponseEntity<?> generate(@RequestParam UUID requestId,@RequestParam String input,@RequestParam(required=false) MultipartFile image,HttpSession session) {
  try {
   var upload=image==null || image.isEmpty()?null:new ImageUpload(image.getBytes());
   return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(drafts.generate(requestId,owner(session),input,upload));
  } catch(IllegalArgumentException invalid) { return ResponseEntity.badRequest().body(Map.of("message",invalid.getMessage())); }
  catch(Exception unavailable) { return ResponseEntity.status(503).body(Map.of("message","結果を確認できません。同じ要求の状態を確認してください。自動再送はしません。")); }
 }
 @GetMapping("/{id}") public ResponseEntity<?> find(@PathVariable UUID id,HttpSession session) {
  try { return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(drafts.find(id,owner(session))); }
  catch(IllegalArgumentException missing) { return ResponseEntity.status(404).body(Map.of("message",missing.getMessage())); }
  catch(RuntimeException unavailable) { return ResponseEntity.status(503).body(Map.of("message","要求の状態を取得できません。時間を置いて再確認してください。")); }
 }
}
