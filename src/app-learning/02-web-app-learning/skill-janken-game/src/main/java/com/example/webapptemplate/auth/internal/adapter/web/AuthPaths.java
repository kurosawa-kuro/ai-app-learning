package com.example.webapptemplate.auth.internal.adapter.web;

import java.util.List;

/** The only paths reachable before sign-in: the login screen, its assets, and the health check. */
public final class AuthPaths {
    public static final List<String> PUBLIC = List.of(
        "/login", "/auth/**", "/logout", "/healthz", "/error",
        "/vendor/**", "/admin-pico/**", "/ui/**", "/favicon.ico");

    static boolean isPublic(String path) {
        if (path == null) return false;
        for (String pattern : PUBLIC) {
            if (pattern.endsWith("/**") ? path.startsWith(pattern.substring(0, pattern.length() - 2)) || path.equals(pattern.substring(0, pattern.length() - 3))
                : path.equals(pattern)) return true;
        }
        return false;
    }

    private AuthPaths() {}
}
