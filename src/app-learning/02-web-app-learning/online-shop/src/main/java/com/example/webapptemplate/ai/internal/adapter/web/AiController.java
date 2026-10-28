package com.example.webapptemplate.ai.internal.adapter.web;

import com.example.webapptemplate.ai.AiConnectivity;
import com.example.webapptemplate.settings.SettingsOperations;
import jakarta.servlet.http.HttpSession;
import java.util.UUID;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class AiController {
    private static final String TOKEN="openai-check-token";
    private final AiConnectivity connectivity;
    private final SettingsOperations policy;
    public AiController(AiConnectivity connectivity, SettingsOperations policy) {
        this.connectivity=connectivity; this.policy=policy;
    }
    @GetMapping("/admin/ai")
    public String show(Model model, HttpSession session) {
        synchronized(session) {
            if(session.getAttribute(TOKEN)==null) session.setAttribute(TOKEN,UUID.randomUUID().toString());
            model.addAttribute("requestToken",session.getAttribute(TOKEN));
        }
        model.addAttribute("openaiConfigured",connectivity.configured());
        model.addAttribute("openaiModel",connectivity.model());
        model.addAttribute("aiAllowed",policy.aiEnabled());
        model.addAttribute("modelAllowed",policy.allowsAiModel(connectivity.model()));
        if(!model.containsAttribute("allowedModelsInput"))
            model.addAttribute("allowedModelsInput",String.join("\n",policy.allowedAiModels()));
        return "ai/index";
    }
    @PostMapping("/admin/ai/models")
    public String models(@RequestParam(defaultValue="") String allowedModelsInput, RedirectAttributes flash) {
        try {
            policy.saveAllowedAiModels(allowedModelsInput);
            flash.addFlashAttribute("message",allowedModelsInput.isBlank()
                ? "許可モデルを保存しました。すべてのAIモデルを禁止しています。"
                : "許可モデルを保存しました。次のAI実行から反映されます。");
        } catch(IllegalArgumentException invalid) {
            flash.addFlashAttribute("error",invalid.getMessage());
            flash.addFlashAttribute("allowedModelsInput",allowedModelsInput.length()<=2000 ? allowedModelsInput : allowedModelsInput.substring(0,2000));
        } catch(org.springframework.dao.DataAccessException unavailable) {
            flash.addFlashAttribute("error","許可モデルを保存できませんでした。接続状態を確認してください。");
            flash.addFlashAttribute("allowedModelsInput",allowedModelsInput);
        }
        return "redirect:/admin/ai";
    }
    @PostMapping("/admin/ai/check")
    public String check(@RequestParam(defaultValue="") String requestToken, HttpSession session, RedirectAttributes flash) {
        synchronized(session) {
            if(requestToken.isBlank() || !requestToken.equals(session.getAttribute(TOKEN))) {
                flash.addFlashAttribute("error","この確認要求は使用済み、または期限切れです。自動再送はしていません。");
                return "redirect:/admin/ai";
            }
            session.removeAttribute(TOKEN);
        }
        flash.addFlashAttribute("checkResult",connectivity.check());
        return "redirect:/admin/ai";
    }
}
