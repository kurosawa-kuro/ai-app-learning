package com.example.webapptemplate;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

/** Values every page layout needs, the selected author cookie, and redirects for form errors. */
@ControllerAdvice(assignableTypes = {PostController.class, AuthorController.class, SettingsController.class, UserIconController.class})
class PageContext {
    // Remembers which author new posts default to. A convenience, not authentication.
    private static final String AUTHOR_COOKIE = "currentAuthor";
    private final PostRepository repository;
    private final ImageStorage storage;
    private final AppSettings settings;
    private final UserIconService icons;
    PageContext(PostRepository repository, ImageStorage storage, AppSettings settings, UserIconService icons) {
        this.repository = repository; this.storage = storage; this.settings = settings; this.icons = icons;
    }

    @ModelAttribute
    void selectedUser(@CookieValue(name = AUTHOR_COOKIE, required = false) String id, Model model) {
        var author = currentAuthor(id);
        model.addAttribute("currentAuthor", author);
        model.addAttribute("sidebarContext", new UiContext.SidebarContext("選択中のユーザー",
                author == null ? "未選択" : author.name(), "ユーザーの追加・管理", "/admin/users",
                author == null ? "" : author.id().toString(), author == null ? null : icons.url(author.id())));
    }

    @ModelAttribute("userIconIds")
    java.util.Set<UUID> userIconIds() { return storage.configured() ? icons.usersWithIcons() : java.util.Set.of(); }

    PostRepository.Author currentAuthor(String id) {
        return resolveAuthor(repository, settings, id);
    }

    static PostRepository.Author resolveAuthor(PostRepository repository, AppSettings settings, String id) {
        try {
            if (id != null) {
                var selected = repository.author(UUID.fromString(id));
                if (selected.isPresent()) return selected.get();
            }
        } catch (IllegalArgumentException malformed) { /* Fall back to the application default. */ }
        var fallback = settings.defaultUserId();
        return fallback == null ? null : repository.author(fallback).orElse(null);
    }
    @ModelAttribute("imagesEnabled")
    boolean imagesEnabled() { return storage.enabled(); }

    @ModelAttribute("storageConfigured")
    boolean storageConfigured() { return storage.configured(); }

    static void selectAuthor(UUID id, HttpServletRequest request, HttpServletResponse response) {
        var cookie = ResponseCookie.from(AUTHOR_COOKIE, id.toString()).path("/").httpOnly(true).sameSite("Lax")
                .secure(request.isSecure()).maxAge(Duration.ofDays(365)).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    String invalid(RuntimeException error, HttpServletRequest request, RedirectAttributes flash) {
        flash.addFlashAttribute("error", error.getMessage());
        return back(request);
    }
    @ExceptionHandler(DataAccessException.class)
    String dbFailure(HttpServletRequest request, RedirectAttributes flash) {
        flash.addFlashAttribute("error", "保存・削除できませんでした。接続状態を確認して、もう一度お試しください。");
        return back(request);
    }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    String tooLarge(RedirectAttributes flash, HttpServletRequest request) {
        flash.addFlashAttribute("error", "画像は5MB以下にしてください。");
        if (request.getRequestURI().matches("/admin/users/[0-9a-f-]{36}/icon"))
            return "redirect:" + request.getRequestURI() + "/edit";
        return "redirect:/posts/new";
    }
    // Return to the screen the failed action started from.
    private static String back(HttpServletRequest request) {
        var path = request.getServletPath();
        if ("GET".equals(request.getMethod())) return "redirect:/posts";
        if (path.startsWith("/admin/users") || path.startsWith("/users")) return "redirect:/admin/users";
        if (path.startsWith("/admin/settings")) return "redirect:/admin/settings";
        if (path.endsWith("/delete")) return "redirect:" + path.substring(0, path.length() - "/delete".length());
        return "redirect:/posts/new";
    }
}
