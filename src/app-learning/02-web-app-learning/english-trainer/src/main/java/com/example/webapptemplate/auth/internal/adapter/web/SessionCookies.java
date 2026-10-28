package com.example.webapptemplate.auth.internal.adapter.web;

import com.example.webapptemplate.auth.internal.adapter.supabase.SupabaseAuthGateway.Session;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;

/** HttpOnly cookies: page scripts never read the Supabase tokens. */
final class SessionCookies {
    static final String ACCESS = "app_access";
    static final String REFRESH = "app_refresh";
    static final String PKCE = "app_pkce";
    // Supabase keeps the session valid; the cookie only bounds how long a browser stays signed in.
    private static final Duration SIGNED_IN = Duration.ofDays(30);

    static String read(HttpServletRequest request, String name) {
        if (request.getCookies() == null) return null;
        for (Cookie cookie : request.getCookies())
            if (cookie.getName().equals(name) && !cookie.getValue().isBlank()) return cookie.getValue();
        return null;
    }

    static void store(HttpServletRequest request, HttpServletResponse response, Session session) {
        set(request, response, ACCESS, session.accessToken(), "/", SIGNED_IN);
        set(request, response, REFRESH, session.refreshToken(), "/", SIGNED_IN);
    }

    static void clear(HttpServletRequest request, HttpServletResponse response) {
        set(request, response, ACCESS, "", "/", Duration.ZERO);
        set(request, response, REFRESH, "", "/", Duration.ZERO);
    }

    /** The PKCE verifier only lives between /auth/google and /auth/callback. */
    static void storeVerifier(HttpServletRequest request, HttpServletResponse response, String verifier) {
        set(request, response, PKCE, verifier, "/auth", Duration.ofMinutes(10));
    }

    static void clearVerifier(HttpServletRequest request, HttpServletResponse response) {
        set(request, response, PKCE, "", "/auth", Duration.ZERO);
    }

    private static void set(HttpServletRequest request, HttpServletResponse response, String name, String value, String path, Duration age) {
        var cookie = ResponseCookie.from(name, value).path(path).httpOnly(true).sameSite("Lax")
            .secure(request.isSecure()).maxAge(age).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private SessionCookies() {}
}
