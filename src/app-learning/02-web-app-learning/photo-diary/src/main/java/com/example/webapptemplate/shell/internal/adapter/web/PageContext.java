package com.example.webapptemplate.shell.internal.adapter.web;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.MissingEntity;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.authors.AuthorView;
import com.example.webapptemplate.authors.UserIcons;
import com.example.webapptemplate.settings.SettingsOperations;

import jakarta.servlet.http.HttpServletRequest;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

/** Values every page layout needs, the selected author cookie, and redirects for form errors. */
@ControllerAdvice(basePackages = {"com.example.webapptemplate.posts.internal.adapter.web", "com.example.webapptemplate.authors.internal.adapter.web", "com.example.webapptemplate.settings.internal.adapter.web", "com.example.webapptemplate.diary"})
public class PageContext {
    // Remembers which author new posts default to. A convenience, not authentication.
    private static final String AUTHOR_COOKIE = "currentAuthor";
    private final AuthorOperations repository;
    private final ImageStore storage;
    private final SettingsOperations settings;
    private final UserIcons icons;
    public PageContext(AuthorOperations repository, ImageStore storage, SettingsOperations settings, UserIcons icons) {
        this.repository = repository; this.storage = storage; this.settings = settings; this.icons = icons;
    }

    @ModelAttribute
    public void selectedUser(@CookieValue(name = AUTHOR_COOKIE, required = false) String id, Model model, HttpServletRequest request) {
        if (!needsPage(request)) return;
        AuthorView author=null;
        boolean unavailable=false;
        String icon=null;
        try { author=currentAuthor(id); if(author!=null) icon=icons.url(author.id()); }
        catch(DataAccessException failure) { unavailable=true; }
        model.addAttribute("currentAuthor", author);
        model.addAttribute("sidebarContext", new UiContext.SidebarContext("選択中のユーザー",
                unavailable ? "取得できません" : author == null ? "未選択" : author.name(), "ユーザーの追加・管理", "/admin/users",
                author == null ? "" : author.id().toString(), icon));
    }

    @ModelAttribute("userIconIds")
    public java.util.Set<UUID> userIconIds(HttpServletRequest request) {
        if (!needsPage(request)) return java.util.Set.of();
        try { return storage.configured() ? icons.usersWithIcons() : java.util.Set.of(); }
        catch(DataAccessException failure) { return java.util.Set.of(); }
    }

    private static boolean needsPage(HttpServletRequest request) {
        String path=request.getRequestURI();
        return !("GET".equals(request.getMethod()) && path.matches("/posts/[0-9a-f-]{36}/image|/admin/users/[0-9a-f-]{36}/icon|/diary/photos/[0-9a-f-]{36}"))
            && !"true".equals(request.getHeader("X-UI-Form"))
            && !path.startsWith("/api/") && !path.equals("/admin/current-user");
    }

    public AuthorView currentAuthor(String id) { return repository.selected(id); }

    @ModelAttribute("imagesEnabled")
    public boolean imagesEnabled(HttpServletRequest request) {
        if (!needsPage(request)) return false;
        try { return settings.imagesEnabled() && storage.configured(); }
        catch(DataAccessException failure) { return false; }
    }

    @ModelAttribute("storageConfigured")
    public boolean storageConfigured() { return storage.configured(); }

    @ExceptionHandler(MissingEntity.class)
    public void notFound(jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        // Keep Boot's existing error page instead of returning an empty 404 response.
        response.sendError(404);
    }

    @ExceptionHandler({IllegalArgumentException.class, IllegalStateException.class})
    public String invalid(RuntimeException error, HttpServletRequest request, RedirectAttributes flash) {
        flash.addFlashAttribute("error", error.getMessage());
        return back(request);
    }
    @ExceptionHandler(DataAccessException.class)
    public String dbFailure(HttpServletRequest request, RedirectAttributes flash) {
        flash.addFlashAttribute("error", "保存・削除できませんでした。接続状態を確認して、もう一度お試しください。");
        return back(request);
    }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public String tooLarge(RedirectAttributes flash, HttpServletRequest request) {
        flash.addFlashAttribute("error", "画像は5MB以下にしてください。");
        if (request.getRequestURI().matches("/admin/users/[0-9a-f-]{36}/icon|/diary/photos/[0-9a-f-]{36}"))
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
