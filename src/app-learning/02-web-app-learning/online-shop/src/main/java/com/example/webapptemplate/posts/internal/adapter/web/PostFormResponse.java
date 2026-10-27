package com.example.webapptemplate.posts.internal.adapter.web;
import java.util.Map;
import jakarta.servlet.http.*;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.web.servlet.FlashMap;
import org.springframework.web.servlet.support.RequestContextUtils;
import org.springframework.web.servlet.mvc.support.RedirectAttributesModelMap;
import org.springframework.http.ResponseEntity;
final class PostFormResponse {
 private PostFormResponse() {}
 static ResponseEntity<?> from(String target,ExtendedModelMap model,RedirectAttributesModelMap flash,HttpServletRequest request,HttpServletResponse response) {
            if (target.startsWith("redirect:")) {
                String url = target.substring("redirect:".length());
                var map = new FlashMap();
                map.putAll(flash.getFlashAttributes()); map.setTargetRequestPath(url);
                RequestContextUtils.getFlashMapManager(request).saveOutputFlashMap(map, request, response);
                return ResponseEntity.ok(Map.of("redirect", url));
            }
            return ResponseEntity.unprocessableEntity().body(Map.of("error", model.getAttribute("error"),
                    "fields", model.containsAttribute("fieldErrors") ? model.getAttribute("fieldErrors") : Map.of()));
 }
}
