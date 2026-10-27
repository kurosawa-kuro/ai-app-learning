package com.example.webapptemplate;

import java.util.UUID;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
import org.springframework.http.*;
import org.springframework.web.server.ResponseStatusException;

@Controller
class UserIconController {
    private final PostRepository repository;
    private final UserIconService icons;
    private final ImageStorage storage;
    UserIconController(PostRepository repository, UserIconService icons, ImageStorage storage) {
        this.repository = repository; this.icons = icons; this.storage = storage;
    }
    @GetMapping("/admin/users/{id}/icon/edit")
    String edit(@PathVariable UUID id, Model model) {
        model.addAttribute("author", repository.author(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND)));
        model.addAttribute("hasIcon", icons.icon(id).isPresent());
        return "users/icon";
    }
    @PostMapping("/admin/users/{id}/icon")
    String save(@PathVariable UUID id, @RequestParam(required=false) MultipartFile image, Model model, RedirectAttributes flash) {
        try {
            int pending = icons.save(id, image);
            flash.addFlashAttribute("message", "アイコンを保存しました。" + cleanupNote(pending));
            return "redirect:/admin/users";
        } catch (IllegalArgumentException | IllegalStateException failure) {
            model.addAttribute("error", failure.getMessage()); return edit(id, model);
        }
    }
    @PostMapping("/admin/users/{id}/icon/delete")
    String remove(@PathVariable UUID id, RedirectAttributes flash) {
        int pending = icons.remove(id);
        flash.addFlashAttribute("message", "アイコンを削除しました。" + cleanupNote(pending));
        return "redirect:/admin/users";
    }
    @GetMapping("/admin/users/{id}/icon")
    ResponseEntity<byte[]> image(@PathVariable UUID id) {
        var icon = icons.icon(id).orElse(null);
        if (icon == null || !storage.configured()) return ResponseEntity.notFound().build();
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType(icon.type()))
            .body(storage.download(icon.bucket(), icon.key()));
    }
    static String cleanupNote(int pending) { return pending > 0 ? " 古い画像の後片付けが保留中です。" : ""; }
}
