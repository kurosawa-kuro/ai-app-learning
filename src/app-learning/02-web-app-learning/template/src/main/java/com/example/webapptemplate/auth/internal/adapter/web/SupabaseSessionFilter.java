package com.example.webapptemplate.auth.internal.adapter.web;

import com.example.webapptemplate.auth.SignedInUser;
import com.example.webapptemplate.auth.internal.adapter.persistence.JdbcAdminList;
import com.example.webapptemplate.auth.internal.adapter.supabase.SupabaseAuthGateway;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.dao.DataAccessException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.client.RestClientException;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads the access token cookie, verifies it locally with the JWKS (no network per request),
 * refreshes it once when expired, and admits only emails in app_admins.
 */
public class SupabaseSessionFilter extends OncePerRequestFilter {
    static final String ADMIN = "ROLE_ADMIN";
    private final JwtDecoder decoder;
    private final SupabaseAuthGateway gateway;
    private final JdbcAdminList admins;
    private final SessionCookies cookies;

    public SupabaseSessionFilter(JwtDecoder decoder, SupabaseAuthGateway gateway, JdbcAdminList admins, SessionCookies cookies) {
        this.decoder = decoder; this.gateway = gateway; this.admins = admins; this.cookies = cookies;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return AuthPaths.isPublic(request.getServletPath());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var user = signedIn(request, response);
        if (user != null) {
            var context = SecurityContextHolder.createEmptyContext();
            context.setAuthentication(new UsernamePasswordAuthenticationToken(user, null, List.of(new SimpleGrantedAuthority(ADMIN))));
            SecurityContextHolder.setContext(context);
        }
        chain.doFilter(request, response);
    }

    private SignedInUser signedIn(HttpServletRequest request, HttpServletResponse response) {
        String access = SessionCookies.read(request, SessionCookies.ACCESS);
        if (access != null) {
            try { return admit(decoder.decode(access), request, response); }
            catch (JwtException expiredOrInvalid) { /* try the refresh token below */ }
        }
        String refresh = SessionCookies.read(request, SessionCookies.REFRESH);
        if (refresh == null) return null;
        try {
            var session = gateway.refresh(refresh);
            if (session == null) { cookies.clear(request, response); return null; }
            var user = admit(decoder.decode(session.accessToken()), request, response);
            if (user != null) cookies.store(request, response, session);
            return user;
        } catch (RestClientException | JwtException unavailable) {
            // Supabase unreachable: keep the cookies so the next request can retry.
            return null;
        }
    }

    private SignedInUser admit(Jwt jwt, HttpServletRequest request, HttpServletResponse response) {
        var user = user(jwt);
        try {
            if (user != null && admins.allows(user.email())) return user;
        } catch (DataAccessException unavailable) {
            return null;
        }
        cookies.clear(request, response);
        return null;
    }

    static SignedInUser user(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        if (email == null || jwt.getSubject() == null || Boolean.TRUE.equals(jwt.getClaimAsBoolean("is_anonymous"))) return null;
        String name = email;
        if (jwt.getClaim("user_metadata") instanceof Map<?, ?> profile) {
            // Display only. user_metadata is editable by the user and never used for permission.
            Object full = profile.get("full_name") != null ? profile.get("full_name") : profile.get("name");
            if (full instanceof String text && !text.isBlank()) name = text.length() > 80 ? text.substring(0, 80) : text;
        }
        try { return new SignedInUser(UUID.fromString(jwt.getSubject()), email, name); }
        catch (IllegalArgumentException invalid) { return null; }
    }
}
