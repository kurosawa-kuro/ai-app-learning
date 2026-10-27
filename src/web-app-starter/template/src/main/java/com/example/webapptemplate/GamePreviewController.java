package com.example.webapptemplate;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Layout/interaction sample, deliberately independent of post and user repositories. */
@Controller
class GamePreviewController {
    @GetMapping("/examples/skill-janken")
    String preview() { return "examples/skill-janken"; }
}
