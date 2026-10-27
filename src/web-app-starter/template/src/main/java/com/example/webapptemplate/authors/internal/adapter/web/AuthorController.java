package com.example.webapptemplate.authors.internal.adapter.web;
import com.example.webapptemplate.platform.BrowserSelection;
import com.example.webapptemplate.authors.AuthorOperations;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import java.util.Map;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class AuthorController {
    private final AuthorOperations repository;
    public AuthorController(AuthorOperations repository) { this.repository = repository; }

    @GetMapping("/users")
    public String legacyUsers() { return "redirect:/admin/users"; }

    @GetMapping("/admin/users")
    public String list(Model model) {
        model.addAttribute("authors", repository.authors());
        model.addAttribute("defaultUserId", repository.defaultUserId());
        return "users/list";
    }
    @PostMapping("/admin/users")
    public String add(@RequestParam String name, HttpServletRequest request, HttpServletResponse response, RedirectAttributes flash, Model model) {
        model.addAttribute("draftName", name);
        name = name.strip();
        if (name.isEmpty() || name.length() > 80) {
            model.addAttribute("error", "ユーザー名を確認してください。");
            model.addAttribute("fieldErrors", Map.of("name", "投稿者名は1〜80文字で入力してください。"));
            return list(model);
        }
        BrowserSelection.selectAuthor(repository.addAuthor(name), request, response);
        flash.addFlashAttribute("message", "投稿者「" + name + "」を登録し、選択しました。");
        return "redirect:/admin/users";
    }
    @PostMapping("/admin/users/{id}/select")
    public String select(@PathVariable UUID id, HttpServletRequest request, HttpServletResponse response, RedirectAttributes flash) {
        var author = repository.author(id).orElseThrow(() -> new IllegalArgumentException("投稿者が見つかりません。"));
        BrowserSelection.selectAuthor(id, request, response);
        flash.addFlashAttribute("message", "投稿者を「" + author.name() + "」に切り替えました。");
        return "redirect:/posts/new";
    }
    @PostMapping("/admin/users/default")
    public String defaultUser(@RequestParam(required = false) UUID userId, RedirectAttributes flash) {
        repository.saveDefaultUser(userId);
        flash.addFlashAttribute("message", "デフォルトユーザーを保存しました。");
        return "redirect:/admin/users";
    }

    @PostMapping("/admin/users/{id}/delete")
    public String delete(@PathVariable UUID id, RedirectAttributes flash) {
        int pending = repository.deleteAuthor(id);
        flash.addFlashAttribute("message", "投稿者を削除しました。" + UserIconController.cleanupNote(pending));
        return "redirect:/admin/users";
    }
}
