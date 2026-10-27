package com.example.webapptemplate.posts.internal.adapter.web;
import com.example.webapptemplate.platform.BrowserSelection;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.Uploads;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.authors.AuthorView;
import com.example.webapptemplate.posts.PostOperations;
import com.example.webapptemplate.posts.internal.domain.PostContent;

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
public class PostController {
    public record PostForm(UUID userId, String title, String body) {}
    private final AuthorOperations repository;
    private final PostOperations service;
    public PostController(AuthorOperations repository, PostOperations service) {
        this.repository = repository; this.service = service;
    }
    @GetMapping("/")
    public String home() { return "redirect:/posts"; }

    @GetMapping("/posts")
    public String list(@RequestParam(required = false) UUID userId,
                       @RequestParam(defaultValue = "1") long page, @RequestParam(defaultValue="") String q,
                       @RequestParam(defaultValue="newest") String sort, Model model) {
        var authors = repository.authors();
        model.addAttribute("authors", authors);
        model.addAttribute("selectedAuthor", authors.stream().filter(a -> a.id().equals(userId)).findFirst().orElse(null));
        model.addAttribute("filtered", userId != null || !q.isBlank());
        model.addAttribute("query",q); model.addAttribute("sort",sort);
        var result = service.search(userId,q,sort,page);
        model.addAttribute("posts", result.items());
        model.addAttribute("postPage", result);
        model.addAttribute("filterUserId", userId);
        return "posts/list";
    }
    @GetMapping("/posts/new")
    public String newPost(@RequestParam(required = false) UUID userId, Model model) {
        var current = (AuthorView) model.getAttribute("currentAuthor");
        var author = userId != null ? userId : current == null ? null : current.id();
        model.addAttribute("form", new PostForm(author, "", ""));
        return form(model);
    }
    @PostMapping("/posts")
    public String create(@RequestParam(required = false) UUID userId, @RequestParam String title, @RequestParam(defaultValue = "") String body,
                  @RequestParam(required = false) MultipartFile image, Model model,
                  HttpServletRequest request, HttpServletResponse response, RedirectAttributes flash) {
        model.addAttribute("form", new PostForm(userId, title, body));
        model.addAttribute("requestId",request.getParameter("requestId"));
        var errors = new LinkedHashMap<String, String>();
        if (userId == null) errors.put("userId", "投稿者を選択してください。");
        errors.putAll(PostContent.errors(title, body));
        if (!errors.isEmpty()) {
            model.addAttribute("error", "入力内容を確認してください。");
            model.addAttribute("fieldErrors", errors);
            return form(model);
        }
        UUID id;
        try {
            var key=request.getParameter("requestId");
            id=key==null || key.isBlank() ? service.create(userId,title,body,Uploads.from(image))
                : service.createOnce(UUID.fromString(key),userId,title,body,Uploads.from(image));
        }
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
        BrowserSelection.selectAuthor(userId, request, response);
        flash.addFlashAttribute("message", "投稿を保存しました。");
        return "redirect:/posts/" + id;
    }
    // Progressive enhancement: JSON errors keep text AND selected file in the current document.
    @PostMapping(value = "/posts", headers = "X-UI-Form=true")
    @ResponseBody
    public ResponseEntity<?> createAsync(@RequestParam(required = false) UUID userId, @RequestParam String title,
            @RequestParam(defaultValue = "") String body, @RequestParam(required = false) MultipartFile image,
            HttpServletRequest request, HttpServletResponse response) {
        var model = new ExtendedModelMap();
        var flash = new RedirectAttributesModelMap();
        try {
            String target = create(userId, title, body, image, model, request, response, flash);
            return PostFormResponse.from(target,model,flash,request,response);
        } catch (DataAccessException unavailable) {
            return ResponseEntity.status(503).body(Map.of("error", "接続できませんでした。入力内容を残したまま再試行できます。", "fields", Map.of()));
        }
    }
    @GetMapping("/posts/{id}/edit")
    public String edit(@PathVariable UUID id,Model model) {
        var post=service.post(id);
        model.addAttribute("form",new PostForm(post.userId(),post.title(),post.body()));
        model.addAttribute("editVersion",post.version()); model.addAttribute("editingId",id); model.addAttribute("savedPost",post);
        return form(model);
    }
    @PostMapping("/posts/{id}/edit")
    public String update(@PathVariable UUID id,@RequestParam long version,@RequestParam String title,
            @RequestParam(defaultValue="") String body,@RequestParam(required=false) MultipartFile image,
            @RequestParam(defaultValue="false") boolean removeImage,Model model,RedirectAttributes flash) {
        var post=service.post(id);
        model.addAttribute("editingId",id); model.addAttribute("editVersion",version); model.addAttribute("savedPost",post);
        model.addAttribute("form",new PostForm(post.userId(),title,body));
        var errors=PostContent.errors(title,body);
        if(!errors.isEmpty()) { model.addAttribute("error","入力内容を確認してください。"); model.addAttribute("fieldErrors",errors); return form(model); }
        try { service.update(id,version,title,body,Uploads.from(image),removeImage); }
        catch(IllegalArgumentException | IllegalStateException failure) { model.addAttribute("error",failure.getMessage()); return form(model); }
        catch(DataAccessException failure) { model.addAttribute("error","保存できませんでした。元の投稿と入力内容は保持しています。再試行してください。"); return form(model); }
        flash.addFlashAttribute("message","投稿を更新しました。");
        return "redirect:/posts/"+id;
    }
    // Progressive enhancement: JSON errors keep text AND selected file in the current document.
    @PostMapping(value = "/posts/{id}/edit", headers = "X-UI-Form=true")
    @ResponseBody
    public ResponseEntity<?> updateAsync(@PathVariable UUID id, @RequestParam long version, @RequestParam(defaultValue="false") boolean removeImage, @RequestParam String title,
            @RequestParam(defaultValue = "") String body, @RequestParam(required = false) MultipartFile image,
            HttpServletRequest request, HttpServletResponse response) {
        var model = new ExtendedModelMap();
        var flash = new RedirectAttributesModelMap();
        try {
            String target = update(id,version,title,body,image,removeImage,model,flash);
            return PostFormResponse.from(target,model,flash,request,response);
        } catch (DataAccessException unavailable) {
            return ResponseEntity.status(503).body(Map.of("error", "接続できませんでした。入力内容を残したまま再試行できます。", "fields", Map.of()));
        }
    }
    @PostMapping("/posts/authors")
    @ResponseBody
    public ResponseEntity<?> addAuthor(@RequestParam String name) {
        name = name.strip();
        if (name.isEmpty() || name.length() > 80)
            return ResponseEntity.badRequest().body(Map.of("error", "投稿者名は1〜80文字で入力してください。"));
        try { return ResponseEntity.ok(Map.of("id", repository.addAuthor(name), "name", name)); }
        catch (DataAccessException unavailable) {
            return ResponseEntity.status(503).body(Map.of("error", "投稿者を追加できませんでした。接続状態を確認してください。"));
        }
    }
    private String form(Model model) {
        if(model.getAttribute("requestId")==null) model.addAttribute("requestId",UUID.randomUUID());
        var authors = repository.authors();
        var draft = (PostForm) model.getAttribute("form");
        model.addAttribute("authors", authors);
        model.addAttribute("chosenAuthor", authors.stream().filter(a -> a.id().equals(draft.userId())).findFirst().orElse(null));
        if (!model.containsAttribute("fieldErrors")) model.addAttribute("fieldErrors", Map.of());
        return "posts/form";
    }
    @GetMapping("/posts/{id}")
    public String detail(@PathVariable UUID id, Model model) {
        model.addAttribute("post", service.post(id));
        return "posts/detail";
    }
    @PostMapping("/posts/{id}/delete")
    public String delete(@PathVariable UUID id, RedirectAttributes flash) {
        service.delete(id);
        flash.addFlashAttribute("message", "投稿を削除しました。");
        return "redirect:/posts";
    }
}
