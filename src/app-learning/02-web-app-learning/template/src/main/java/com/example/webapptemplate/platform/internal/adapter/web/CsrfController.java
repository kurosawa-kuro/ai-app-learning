package com.example.webapptemplate.platform.internal.adapter.web;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
/** Refresh a stale form token without throwing away text or the selected file. */
@RestController
public class CsrfController {
 @GetMapping("/csrf") public ResponseEntity<?> token(CsrfToken token) {
  return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(Map.of("token",token.getToken()));
 }
}
