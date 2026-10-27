package com.example.webapptemplate;

import java.util.UUID;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.CacheControl;
import org.springframework.dao.DataAccessException;

@Controller
class PostController {
    private final PostRepository repository;
    private final PostService service;
    private final ImageStorage storage;
    PostController(PostRepository repository, PostService service, ImageStorage storage) {
        this.repository = repository; this.service = service; this.storage = storage;
    }
    @GetMapping("/")
    String index(@RequestParam(required = false) UUID userId, Model model) {
        model.addAttribute("authors", repository.authors());
        model.addAttribute("posts", repository.posts(userId));
        model.addAttribute("selectedUser", userId);
        model.addAttribute("imagesEnabled", storage.enabled());
        return "posts";
    }
    @PostMapping("/users")
    String addUser(@RequestParam String name, RedirectAttributes flash) {
        name = name.strip();
        if (name.isEmpty() || name.length() > 80) throw new IllegalArgumentException("投稿者名は1〜80文字で入力してください。");
        repository.addAuthor(name);
        flash.addFlashAttribute("message", "投稿者を登録しました。");
        return "redirect:/";
    }
    @PostMapping("/users/{id}/delete")
    String deleteUser(@PathVariable UUID id, RedirectAttributes flash) {
        repository.deleteAuthor(id);
        flash.addFlashAttribute("message", "投稿者を削除しました。");
        return "redirect:/";
    }
    @PostMapping("/posts")
    String create(@RequestParam UUID userId, @RequestParam String title, @RequestParam(defaultValue = "") String body,
                  @RequestParam(required = false) MultipartFile image, RedirectAttributes flash) {
        service.create(userId, title, body, image);
        flash.addFlashAttribute("message", "投稿を保存しました。");
        return "redirect:/";
    }
    @PostMapping("/posts/{id}/delete")
    String delete(@PathVariable UUID id, RedirectAttributes flash) {
        service.delete(id);
        flash.addFlashAttribute("message", "投稿を削除しました。");
        return "redirect:/";
    }
    @GetMapping("/posts/{id}/image")
    ResponseEntity<byte[]> image(@PathVariable UUID id) {
        var post = repository.post(id);
        if (!storage.enabled() || post.imageKey() == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType(post.imageType()))
                .body(storage.download(post.imageBucket(), post.imageKey()));
    }
    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    String invalid(RuntimeException error, RedirectAttributes flash) {
        flash.addFlashAttribute("error", error.getMessage());
        return "redirect:/";
    }
    @ExceptionHandler(DataAccessException.class)
    String dbFailure(RedirectAttributes flash) {
        flash.addFlashAttribute("error", "保存・削除できませんでした。投稿が残っている投稿者は削除できません。接続状態も確認してください。");
        return "redirect:/";
    }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    String tooLarge(RedirectAttributes flash) {
        flash.addFlashAttribute("error", "画像は5MB以下にしてください。");
        return "redirect:/";
    }
}
