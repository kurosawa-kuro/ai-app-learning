package com.example.webapptemplate;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** Selection is a convenience cookie, not authentication or a change of default user. */
@RestController
class UserSelectionController {
    record User(UUID id, String name, String iconUrl) {}
    record Options(List<User> users, User selected) {}
    private final PostRepository repository;
    private final AppSettings settings;
    private final UserIconService icons;
    UserSelectionController(PostRepository repository, AppSettings settings, UserIconService icons) {
        this.repository = repository; this.settings = settings; this.icons = icons;
    }

    @GetMapping("/admin/current-user")
    ResponseEntity<Options> options(@CookieValue(name = "currentAuthor", required = false) String id) {
        var selected = PageContext.resolveAuthor(repository, settings, id);
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(new Options(
            repository.authors().stream().map(a -> new User(a.id(), a.name(), icons.url(a.id()))).toList(),
            selected == null ? null : new User(selected.id(), selected.name(), icons.url(selected.id()))));
    }

    @PostMapping("/admin/current-user")
    ResponseEntity<?> select(@RequestParam UUID userId, HttpServletRequest request, HttpServletResponse response) {
        var user = repository.author(userId).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("error", "このユーザーは見つかりません。一覧を開き直してください。"));
        PageContext.selectAuthor(userId, request, response);
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(new User(user.id(), user.name(), icons.url(user.id())));
    }

    @ExceptionHandler(DataAccessException.class)
    ResponseEntity<?> unavailable() {
        return ResponseEntity.status(503).header("Cache-Control", "no-store")
            .body(Map.of("error", "ユーザー情報を取得できませんでした。時間をおいて再試行してください。"));
    }
}
