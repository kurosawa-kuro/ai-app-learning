package com.example.webapptemplate;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import java.util.Map;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
class AuthorController {
    private final PostRepository repository;
    private final AppSettings settings;
    private final UserIconService icons;
    AuthorController(PostRepository repository, AppSettings settings, UserIconService icons) { this.repository = repository; this.settings = settings; this.icons = icons; }

    @GetMapping("/users")
    String legacyUsers() { return "redirect:/admin/users"; }

    @GetMapping("/admin/users")
    String list(Model model) {
        model.addAttribute("authors", repository.authors());
        model.addAttribute("defaultUserId", settings.defaultUserId());
        return "users/list";
    }
    @PostMapping("/admin/users")
    String add(@RequestParam String name, HttpServletRequest request, HttpServletResponse response, RedirectAttributes flash, Model model) {
        model.addAttribute("draftName", name);
        name = name.strip();
        if (name.isEmpty() || name.length() > 80) {
            model.addAttribute("error", "ユーザー名を確認してください。");
            model.addAttribute("fieldErrors", Map.of("name", "投稿者名は1〜80文字で入力してください。"));
            return list(model);
        }
        PageContext.selectAuthor(repository.addAuthor(name), request, response);
        flash.addFlashAttribute("message", "投稿者「" + name + "」を登録し、選択しました。");
        return "redirect:/admin/users";
    }
    @PostMapping("/admin/users/{id}/select")
    String select(@PathVariable UUID id, HttpServletRequest request, HttpServletResponse response, RedirectAttributes flash) {
        var author = repository.author(id).orElseThrow(() -> new IllegalArgumentException("投稿者が見つかりません。"));
        PageContext.selectAuthor(id, request, response);
        flash.addFlashAttribute("message", "投稿者を「" + author.name() + "」に切り替えました。");
        return "redirect:/posts/new";
    }
    @PostMapping("/admin/users/default")
    String defaultUser(@RequestParam(required = false) UUID userId, RedirectAttributes flash) {
        if (userId != null) repository.requireAuthor(userId);
        settings.saveDefaultUser(userId);
        flash.addFlashAttribute("message", "デフォルトユーザーを保存しました。");
        return "redirect:/admin/users";
    }

    @PostMapping("/admin/users/{id}/delete")
    String delete(@PathVariable UUID id, RedirectAttributes flash) {
        int pending = icons.deleteUser(id);
        flash.addFlashAttribute("message", "投稿者を削除しました。" + UserIconController.cleanupNote(pending));
        return "redirect:/admin/users";
    }
}
