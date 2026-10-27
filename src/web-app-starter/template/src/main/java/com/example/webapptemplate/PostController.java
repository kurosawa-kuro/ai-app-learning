package com.example.webapptemplate;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.http.CacheControl;

@Controller
class PostController {
    record PostForm(UUID userId, String title, String body) {}
    private final PostRepository repository;
    private final PostService service;
    private final ImageStorage storage;
    PostController(PostRepository repository, PostService service, ImageStorage storage) {
        this.repository = repository; this.service = service; this.storage = storage;
    }
    @GetMapping("/")
    String home() { return "redirect:/posts"; }

    @GetMapping("/posts")
    String list(@RequestParam(required = false) UUID userId, Model model) {
        var authors = repository.authors();
        model.addAttribute("authors", authors);
        model.addAttribute("selectedAuthor", authors.stream().filter(a -> a.id().equals(userId)).findFirst().orElse(null));
        model.addAttribute("posts", repository.posts(userId));
        return "posts/list";
    }
    @GetMapping("/posts/new")
    String newPost(@RequestParam(required = false) UUID userId, Model model) {
        var current = (PostRepository.Author) model.getAttribute("currentAuthor");
        var author = userId != null ? userId : current == null ? null : current.id();
        model.addAttribute("form", new PostForm(author, "", ""));
        return form(model);
    }
    @PostMapping("/posts")
    String create(@RequestParam(required = false) UUID userId, @RequestParam String title, @RequestParam(defaultValue = "") String body,
                  @RequestParam(required = false) MultipartFile image, Model model,
                  HttpServletRequest request, HttpServletResponse response, RedirectAttributes flash) {
        UUID id;
        try { id = service.create(userId, title, body, image); }
        catch (IllegalArgumentException | IllegalStateException invalid) {
            // Re-render instead of redirecting so the typed title and body survive.
            model.addAttribute("error", invalid.getMessage());
            model.addAttribute("form", new PostForm(userId, title, body));
            return form(model);
        }
        PageContext.selectAuthor(userId, request, response);
        flash.addFlashAttribute("message", "投稿を保存しました。");
        return "redirect:/posts/" + id;
    }
    private String form(Model model) {
        model.addAttribute("authors", repository.authors());
        return "posts/form";
    }
    @GetMapping("/posts/{id}")
    String detail(@PathVariable UUID id, Model model) {
        model.addAttribute("post", repository.post(id));
        return "posts/detail";
    }
    @PostMapping("/posts/{id}/delete")
    String delete(@PathVariable UUID id, RedirectAttributes flash) {
        service.delete(id);
        flash.addFlashAttribute("message", "投稿を削除しました。");
        return "redirect:/posts";
    }
    @GetMapping("/posts/{id}/image")
    ResponseEntity<byte[]> image(@PathVariable UUID id) {
        var post = repository.post(id);
        if (!storage.enabled() || post.imageKey() == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType(post.imageType()))
                .body(storage.download(post.imageBucket(), post.imageKey()));
    }
}
