package com.example.webapptemplate.authors.internal.adapter.web;
import com.example.webapptemplate.platform.BrowserSelection;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.authors.UserIcons;

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
public class UserSelectionController {
    public record User(UUID id, String name, String iconUrl) {}
    public record Options(List<User> users, User selected) {}
    private final AuthorOperations repository;
    private final UserIcons icons;
    public UserSelectionController(AuthorOperations repository, UserIcons icons) {
        this.repository = repository; this.icons = icons;
    }

    @GetMapping("/admin/current-user")
    public ResponseEntity<Options> options(@CookieValue(name = "currentAuthor", required = false) String id) {
        var selected = repository.selected(id);
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(new Options(
            repository.authors().stream().map(a -> new User(a.id(), a.name(), icons.url(a.id()))).toList(),
            selected == null ? null : new User(selected.id(), selected.name(), icons.url(selected.id()))));
    }

    @PostMapping("/admin/current-user")
    public ResponseEntity<?> select(@RequestParam UUID userId, HttpServletRequest request, HttpServletResponse response) {
        var user = repository.author(userId).orElse(null);
        if (user == null) return ResponseEntity.status(404).body(Map.of("error", "このユーザーは見つかりません。一覧を開き直してください。"));
        BrowserSelection.selectAuthor(userId, request, response);
        return ResponseEntity.ok().header("Cache-Control", "no-store").body(new User(user.id(), user.name(), icons.url(user.id())));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<?> unavailable() {
        return ResponseEntity.status(503).header("Cache-Control", "no-store")
            .body(Map.of("error", "ユーザー情報を取得できませんでした。時間をおいて再試行してください。"));
    }
}
