package com.example.webapptemplate.games.internal.adapter.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Layout/interaction sample, deliberately independent of post and user repositories. */
@Controller
public class GamePreviewController {
    @GetMapping("/examples/skill-janken")
    public String preview() { return "examples/skill-janken"; }
}
