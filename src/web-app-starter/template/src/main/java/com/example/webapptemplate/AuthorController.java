package com.example.webapptemplate;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
class AuthorController {
    private final PostRepository repository;
    AuthorController(PostRepository repository) { this.repository = repository; }

    @GetMapping("/users")
    String list(Model model) {
        model.addAttribute("authors", repository.authors());
        return "users/list";
    }
    @PostMapping("/users")
    String add(@RequestParam String name, HttpServletRequest request, HttpServletResponse response, RedirectAttributes flash) {
        name = name.strip();
        if (name.isEmpty() || name.length() > 80) throw new IllegalArgumentException("投稿者名は1〜80文字で入力してください。");
        PageContext.selectAuthor(repository.addAuthor(name), request, response);
        flash.addFlashAttribute("message", "投稿者「" + name + "」を登録し、選択しました。");
        return "redirect:/users";
    }
    @PostMapping("/users/{id}/select")
    String select(@PathVariable UUID id, HttpServletRequest request, HttpServletResponse response, RedirectAttributes flash) {
        var author = repository.author(id).orElseThrow(() -> new IllegalArgumentException("投稿者が見つかりません。"));
        PageContext.selectAuthor(id, request, response);
        flash.addFlashAttribute("message", "投稿者を「" + author.name() + "」に切り替えました。");
        return "redirect:/posts/new";
    }
    @PostMapping("/users/{id}/delete")
    String delete(@PathVariable UUID id, RedirectAttributes flash) {
        repository.deleteAuthor(id);
        flash.addFlashAttribute("message", "投稿者を削除しました。");
        return "redirect:/users";
    }
}
