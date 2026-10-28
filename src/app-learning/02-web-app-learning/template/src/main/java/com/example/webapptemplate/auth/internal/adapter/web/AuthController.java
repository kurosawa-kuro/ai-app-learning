package com.example.webapptemplate.auth.internal.adapter.web;

import com.example.webapptemplate.auth.internal.AuthProperties;
import com.example.webapptemplate.auth.internal.adapter.persistence.JdbcAdminList;
import com.example.webapptemplate.auth.internal.adapter.supabase.SupabaseAuthGateway;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.dao.DataAccessException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.client.RestClientException;

/** Google sign-in through Supabase Auth with the server-side PKCE flow. */
@Controller
@ConditionalOnProperty(name = "app.auth.enabled", havingValue = "true")
public class AuthController {
    private static final Map<String, String> MESSAGES = Map.of(
        "denied", "このGoogleアカウントには利用権限がありません。管理者に追加を依頼してください。",
        "failed", "ログインできませんでした。もう一度お試しください。",
        "unavailable", "ログインの確認ができませんでした。時間をおいて再試行してください。",
        "logout", "ログアウトしました。");
    private static final SecureRandom RANDOM = new SecureRandom();
    private final SupabaseAuthGateway gateway;
    private final JwtDecoder decoder;
    private final JdbcAdminList admins;
    private final AuthProperties properties;
    private final SessionCookies cookies;

    public AuthController(SupabaseAuthGateway gateway, JwtDecoder decoder, JdbcAdminList admins, AuthProperties properties, SessionCookies cookies) {
        this.gateway = gateway; this.decoder = decoder; this.admins = admins; this.properties = properties; this.cookies = cookies;
    }

    @GetMapping("/login")
    public String login(@RequestParam(required = false) String error, @RequestParam(required = false) String logout, Model model) {
        model.addAttribute("message", logout != null ? MESSAGES.get("logout") : error == null ? null : MESSAGES.getOrDefault(error, MESSAGES.get("failed")));
        model.addAttribute("failed", error != null);
        return "auth/login";
    }

    @GetMapping("/auth/google")
    public String google(HttpServletRequest request, HttpServletResponse response) {
        byte[] random = new byte[32];
        RANDOM.nextBytes(random);
        String verifier = Base64.getUrlEncoder().withoutPadding().encodeToString(random);
        cookies.storeVerifier(request, response, verifier);
        return "redirect:" + gateway.googleAuthorizeUrl(properties.getCallbackUrl(), challenge(verifier));
    }

    @GetMapping("/auth/callback")
    public String callback(@RequestParam(required = false) String code, HttpServletRequest request, HttpServletResponse response) {
        String verifier = SessionCookies.read(request, SessionCookies.PKCE);
        cookies.clearVerifier(request, response);
        if (code == null || code.isBlank() || verifier == null) return "redirect:/login?error=failed";
        try {
            var session = gateway.exchange(code, verifier);
            if (session == null) return "redirect:/login?error=failed";
            var user = SupabaseSessionFilter.user(decoder.decode(session.accessToken()));
            if (user != null) admins.forget(user.email());
            if (user == null || !admins.allows(user.email())) {
                cookies.clear(request, response);
                try { gateway.logout(session.accessToken()); } catch (RestClientException unavailable) { /* local denial still applies */ }
                return "redirect:/login?error=denied";
            }
            cookies.store(request, response, session);
            return "redirect:" + properties.getHome();
        } catch (RestClientException | JwtException | DataAccessException unavailable) {
            return "redirect:/login?error=unavailable";
        }
    }

    @PostMapping("/logout")
    public String logout(HttpServletRequest request, HttpServletResponse response) {
        String access = SessionCookies.read(request, SessionCookies.ACCESS);
        if (access != null) {
            try { gateway.logout(access); } catch (RestClientException unavailable) { /* cookies are cleared anyway */ }
        }
        cookies.clear(request, response);
        return "redirect:/login?logout";
    }


    private static String challenge(String verifier) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException(impossible);
        }
    }
}
