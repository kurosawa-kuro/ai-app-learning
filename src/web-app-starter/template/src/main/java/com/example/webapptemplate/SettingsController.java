package com.example.webapptemplate;

import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
class SettingsController {
    private final AppSettings settings;
    private final ImageStorage storage;

    SettingsController(AppSettings settings, ImageStorage storage) {
        this.settings = settings;
        this.storage = storage;
    }

    @GetMapping("/admin")
    String admin(Model model) {
        model.addAttribute("aiEnabled", settings.aiEnabled());
        return "admin/index";
    }

    @GetMapping("/settings")
    String legacySettings() { return "redirect:/admin/settings"; }

    @GetMapping("/admin/settings")
    String show(Model model) {
        model.addAttribute("imagePosting", settings.imagesEnabled());
        model.addAttribute("aiIntegration", settings.aiEnabled());
        return page(model);
    }

    @PostMapping("/admin/settings")
    String save(@RequestParam(defaultValue = "false") boolean imagePosting,
                @RequestParam(defaultValue = "false") boolean aiIntegration, Model model, RedirectAttributes flash) {
        try {
            // Validate Storage before changing the preference. OFF needs no Storage connection.
            if (imagePosting) storage.ensureBucket();
            settings.saveFeatures(imagePosting, aiIntegration);
        } catch (IllegalStateException | DataAccessException failure) {
            model.addAttribute("imagePosting", imagePosting);
            model.addAttribute("aiIntegration", aiIntegration);
            model.addAttribute("error", failure instanceof DataAccessException
                    ? "設定を保存できませんでした。接続状態を確認して再試行してください。"
                    : failure.getMessage());
            return page(model);
        }
        flash.addFlashAttribute("message", "機能設定を保存しました。画像投稿：" + (imagePosting ? "許可" : "禁止")
                + "、AI連携：" + (aiIntegration ? "許可" : "禁止") + "。");
        return "redirect:/admin/settings";
    }

    private String page(Model model) {
        model.addAttribute("storageConfigured", storage.configured());
        return "settings/index";
    }
}
