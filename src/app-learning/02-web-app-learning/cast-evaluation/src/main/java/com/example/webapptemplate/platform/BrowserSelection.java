package com.example.webapptemplate.platform;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.UUID;
import java.time.Duration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
public final class BrowserSelection {
    private static final String AUTHOR_COOKIE = "currentAuthor";
    public static void selectAuthor(UUID id, HttpServletRequest request, HttpServletResponse response) {
        var cookie = ResponseCookie.from(AUTHOR_COOKIE, id.toString()).path("/").httpOnly(true).sameSite("Lax")
                .secure(request.isSecure()).maxAge(Duration.ofDays(365)).build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private BrowserSelection() {}
}
