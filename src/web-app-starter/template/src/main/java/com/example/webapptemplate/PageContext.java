package com.example.webapptemplate;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

/** Values every page layout needs, the selected author cookie, and redirects for form errors. */
@ControllerAdvice
class PageContext {
    // Remembers which author new posts default to. A convenience, not authentication.
    private static final String AUTHOR_COOKIE = "currentAuthor";
    private final PostRepository repository;
    private final ImageStorage storage;
    PageContext(PostRepository repository, ImageStorage storage) { this.repository = repository; this.storage = storage; }

    @ModelAttribute("currentAuthor")
    PostRepository.Author currentAuthor(@CookieValue(name = AUTHOR_COOKIE, required = false) String id) {
        try { return id == null ? null : repository.author(UUID.fromString(id)).orElse(null); }
        catch (IllegalArgumentException malformed) { return null; }
    }
    @ModelAttribute("imagesEnabled")
    boolean imagesEnabled() { return storage.enabled(); }

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
    String tooLarge(RedirectAttributes flash) {
        flash.addFlashAttribute("error", "画像は5MB以下にしてください。");
        return "redirect:/posts/new";
    }
    // Return to the screen the failed action started from.
    private static String back(HttpServletRequest request) {
        var path = request.getServletPath();
        if ("GET".equals(request.getMethod())) return "redirect:/posts";
        if (path.startsWith("/users")) return "redirect:/users";
        if (path.endsWith("/delete")) return "redirect:" + path.substring(0, path.length() - "/delete".length());
        return "redirect:/posts/new";
    }
}
