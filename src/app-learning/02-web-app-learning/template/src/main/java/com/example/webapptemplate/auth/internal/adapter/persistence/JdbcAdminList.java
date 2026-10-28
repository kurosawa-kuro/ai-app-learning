package com.example.webapptemplate.auth.internal.adapter.persistence;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.jdbc.core.simple.JdbcClient;

/**
 * app_admins decides who may use this app. Supabase accounts are shared per project, so signing in
 * with Google alone is not enough. Answers are cached briefly so images and CSS-heavy pages do not
 * query the table on every request.
 */
public class JdbcAdminList {
    private static final Duration CACHE = Duration.ofSeconds(60);
    private record Answer(boolean allowed, Instant until) {}
    private final JdbcClient jdbc;
    private final Clock clock;
    private final Map<String, Answer> cache = new ConcurrentHashMap<>();

    public JdbcAdminList(JdbcClient jdbc) { this(jdbc, Clock.systemUTC()); }
    JdbcAdminList(JdbcClient jdbc, Clock clock) { this.jdbc = jdbc; this.clock = clock; }

    public boolean allows(String email) {
        if (email == null || email.isBlank()) return false;
        String key = email.trim().toLowerCase(Locale.ROOT);
        var now = clock.instant();
        var cached = cache.get(key);
        if (cached != null && cached.until().isAfter(now)) return cached.allowed();
        boolean allowed = jdbc.sql("SELECT EXISTS(SELECT 1 FROM app_admins WHERE email = :email)")
            .param("email", key).query(Boolean.class).single();
        cache.put(key, new Answer(allowed, now.plus(CACHE)));
        return allowed;
    }

    /** Called after sign-in so a newly added admin is not refused by a stale cached answer. */
    public void forget(String email) {
        if (email != null) cache.remove(email.trim().toLowerCase(Locale.ROOT));
    }
}
