package com.example.webapptemplate;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import java.util.Map;
import java.util.LinkedHashMap;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.FlashMap;
import org.springframework.web.servlet.support.RequestContextUtils;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.web.servlet.mvc.support.RedirectAttributesModelMap;
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
        model.addAttribute("filtered", userId != null);
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
        model.addAttribute("form", new PostForm(userId, title, body));
        var errors = new LinkedHashMap<String, String>();
        if (userId == null) errors.put("userId", "投稿者を選択してください。");
        if (title.isBlank() || title.strip().length() > 120) errors.put("title", "タイトルは1〜120文字で入力してください。");
        if (body.strip().length() > 5000) errors.put("body", "本文は5000文字以内で入力してください。");
        if (!errors.isEmpty()) {
            model.addAttribute("error", "入力内容を確認してください。");
            model.addAttribute("fieldErrors", errors);
            return form(model);
        }
        UUID id;
        try { id = service.create(userId, title, body, image); }
        catch (IllegalArgumentException | IllegalStateException invalid) {
            model.addAttribute("error", invalid.getMessage());
            if (image != null && !image.isEmpty()) errors.put("image", invalid.getMessage());
            else errors.put("userId", invalid.getMessage());
            model.addAttribute("fieldErrors", errors);
            return form(model);
        } catch (DataAccessException unavailable) {
            model.addAttribute("error", "投稿を保存できませんでした。入力内容は残っています。接続状態を確認して再試行してください。");
            return form(model);
        }
        PageContext.selectAuthor(userId, request, response);
        flash.addFlashAttribute("message", "投稿を保存しました。");
        return "redirect:/posts/" + id;
    }
    // Progressive enhancement: JSON errors keep text AND selected file in the current document.
    @PostMapping(value = "/posts", headers = "X-UI-Form=true")
    @ResponseBody
    ResponseEntity<?> createAsync(@RequestParam(required = false) UUID userId, @RequestParam String title,
            @RequestParam(defaultValue = "") String body, @RequestParam(required = false) MultipartFile image,
            HttpServletRequest request, HttpServletResponse response) {
        var model = new ExtendedModelMap();
        var flash = new RedirectAttributesModelMap();
        try {
            String target = create(userId, title, body, image, model, request, response, flash);
            if (target.startsWith("redirect:")) {
                String url = target.substring("redirect:".length());
                var map = new FlashMap();
                map.putAll(flash.getFlashAttributes()); map.setTargetRequestPath(url);
                RequestContextUtils.getFlashMapManager(request).saveOutputFlashMap(map, request, response);
                return ResponseEntity.ok(Map.of("redirect", url));
            }
            return ResponseEntity.unprocessableEntity().body(Map.of("error", model.getAttribute("error"),
                    "fields", model.containsAttribute("fieldErrors") ? model.getAttribute("fieldErrors") : Map.of()));
        } catch (DataAccessException unavailable) {
            return ResponseEntity.status(503).body(Map.of("error", "接続できませんでした。入力内容を残したまま再試行できます。", "fields", Map.of()));
        }
    }
    @PostMapping("/posts/authors")
    @ResponseBody
    ResponseEntity<?> addAuthor(@RequestParam String name) {
        name = name.strip();
        if (name.isEmpty() || name.length() > 80)
            return ResponseEntity.badRequest().body(Map.of("error", "投稿者名は1〜80文字で入力してください。"));
        try { return ResponseEntity.ok(Map.of("id", repository.addAuthor(name), "name", name)); }
        catch (DataAccessException unavailable) {
            return ResponseEntity.status(503).body(Map.of("error", "投稿者を追加できませんでした。接続状態を確認してください。"));
        }
    }
    private String form(Model model) {
        var authors = repository.authors();
        var draft = (PostForm) model.getAttribute("form");
        model.addAttribute("authors", authors);
        model.addAttribute("chosenAuthor", authors.stream().filter(a -> a.id().equals(draft.userId())).findFirst().orElse(null));
        if (!model.containsAttribute("fieldErrors")) model.addAttribute("fieldErrors", Map.of());
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
        if (!storage.configured() || post.imageKey() == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType(post.imageType()))
                .body(storage.download(post.imageBucket(), post.imageKey()));
    }
}
