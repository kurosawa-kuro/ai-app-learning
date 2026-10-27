package com.example.webapptemplate.authors.internal.adapter.web;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.Uploads;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.authors.UserIcons;

import java.util.UUID;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;

@Controller
public class UserIconController {
    private final AuthorOperations repository;
    private final UserIcons icons;
    private final ImageStore storage;
    public UserIconController(AuthorOperations repository, UserIcons icons, ImageStore storage) {
        this.repository = repository; this.icons = icons; this.storage = storage;
    }
    @GetMapping("/admin/users/{id}/icon/edit")
    public String edit(@PathVariable UUID id, Model model) {
        model.addAttribute("author", repository.author(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)));
        model.addAttribute("hasIcon", icons.icon(id).isPresent());
        return "users/icon";
    }
    @PostMapping("/admin/users/{id}/icon")
    public String save(@PathVariable UUID id, @RequestParam(required=false) MultipartFile image, Model model, RedirectAttributes flash) {
        try {
            int pending = icons.save(id, Uploads.from(image));
            flash.addFlashAttribute("message", "アイコンを保存しました。" + cleanupNote(pending));
            return "redirect:/admin/users";
        } catch (IllegalArgumentException | IllegalStateException failure) {
            model.addAttribute("error", failure.getMessage()); return edit(id, model);
        }
    }
    @PostMapping("/admin/users/{id}/icon/delete")
    public String remove(@PathVariable UUID id, RedirectAttributes flash) {
        int pending = icons.remove(id);
        flash.addFlashAttribute("message", "アイコンを削除しました。" + cleanupNote(pending));
        return "redirect:/admin/users";
    }
    @GetMapping("/admin/users/{id}/icon")
    public ResponseEntity<byte[]> image(@PathVariable UUID id) {
        var icon = icons.icon(id).orElse(null);
        if (icon == null || !storage.configured()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType(icon.type()))
            .body(storage.download(icon.bucket(), icon.key()));
    }
    public static String cleanupNote(int pending) { return pending > 0 ? " 古い画像の後片付けが保留中です。" : ""; }
}
