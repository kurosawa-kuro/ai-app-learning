package com.example.webapptemplate.platform.internal.adapter.web;

import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController
class HealthController {
    @GetMapping("/healthz") Map<String,String> health() { return Map.of("status","up"); }
}
