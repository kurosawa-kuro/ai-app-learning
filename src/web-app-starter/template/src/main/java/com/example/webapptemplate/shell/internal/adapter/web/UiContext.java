package com.example.webapptemplate.shell.internal.adapter.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

/** Application navigation lives here, not in the reusable shell. No database dependency. */
@ControllerAdvice
public class UiContext {
    public record Link(String label, String url, boolean active) {}
    public record Navigation(String name, String home, boolean sidebar, List<Link> links) {}
    public record SidebarContext(String label, String value, String action, String url, String selectedId, String iconUrl) {}

    @ModelAttribute("managementLinks")
    public List<Link> managementLinks(HttpServletRequest request) {
        String path = request.getRequestURI();
        return List.of(new Link("ユーザー管理", "/admin/users", path.equals("/admin/users")),
                new Link("機能管理", "/admin/settings", path.equals("/admin/settings")),
                new Link("CSVエクスポート", "/admin#csv-export", false),
                new Link("管理の一覧", "/admin", path.equals("/admin")));
    }

    @ModelAttribute("appStyles")
    public List<String> styles(HttpServletRequest request) {
        return List.of(request.getRequestURI().startsWith("/examples/skill-janken")
                ? "/examples/skill-janken.css" : "/features/posts/posts.css");
    }

    @ModelAttribute("appScripts")
    public List<String> scripts(HttpServletRequest request) {
        return request.getRequestURI().startsWith("/examples/skill-janken")
                ? List.of("/examples/janken-rules.js", "/examples/skill-janken.js")
                : List.of("/features/posts/posts.js");
    }

    @ModelAttribute("navigation")
    public Navigation navigation(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.startsWith("/examples/skill-janken")) {
            return new Navigation("スキルじゃんけん", "/examples/skill-janken", false, List.of(
                    new Link("じゃんけん", "/examples/skill-janken", true),
                    new Link("投稿ノート", "/posts", false)));
        }
        return new Navigation("アプリスターター", "/posts", true, List.of(
                new Link("投稿一覧", "/posts", path.equals("/") || (path.equals("/posts") && request.getMethod().equals("GET")) || path.matches("/posts/[0-9a-f-]{36}.*")),
                new Link("新規投稿", "/posts/new", path.equals("/posts/new") || (path.equals("/posts") && request.getMethod().equals("POST"))),
                new Link("じゃんけん体験", "/examples/skill-janken", false)));
    }
}
