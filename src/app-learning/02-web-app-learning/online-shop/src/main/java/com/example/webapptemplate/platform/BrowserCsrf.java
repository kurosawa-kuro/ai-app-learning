package com.example.webapptemplate.platform;

import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

/** One CSRF setup for every security chain, so pages and scripts keep the same header and cookie. */
public final class BrowserCsrf {
    public static CookieCsrfTokenRepository repository() {
        var csrf = new CookieCsrfTokenRepository();
        csrf.setHeaderName("X-CSRF-TOKEN");
        csrf.setCookieCustomizer(cookie -> cookie.sameSite("Lax"));
        return csrf;
    }

    private BrowserCsrf() {}
}
