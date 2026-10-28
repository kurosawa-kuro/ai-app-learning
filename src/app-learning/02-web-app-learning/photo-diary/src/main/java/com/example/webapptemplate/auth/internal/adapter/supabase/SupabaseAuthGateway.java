package com.example.webapptemplate.auth.internal.adapter.supabase;

import com.example.webapptemplate.auth.internal.AuthProperties;
import java.net.http.HttpClient;
import java.time.Duration;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Supabase Auth over HTTP, as supabase-js does it: /authorize with PKCE, then /token?grant_type=pkce.
 * The browser never receives the publishable key or reads the tokens.
 */
public class SupabaseAuthGateway {
    public record Session(String accessToken, String refreshToken) {}
    private final AuthProperties properties;
    private final RestClient client;

    public SupabaseAuthGateway(AuthProperties properties) {
        this.properties = properties;
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(properties.getTimeout());
        this.client = RestClient.builder().requestFactory(factory).baseUrl(properties.issuer())
            .defaultHeader("apikey", properties.getPublishableKey()).build();
    }

    public String googleAuthorizeUrl(String redirectTo, String codeChallenge) {
        return UriComponentsBuilder.fromUriString(properties.issuer() + "/authorize")
            .queryParam("provider", "google").queryParam("redirect_to", redirectTo)
            .queryParam("code_challenge", codeChallenge).queryParam("code_challenge_method", "s256")
            .encode().build().toUriString();
    }

    /** Returns null when Supabase rejects the code; network failures propagate. */
    public Session exchange(String code, String verifier) {
        return token("pkce", Map.of("auth_code", code, "code_verifier", verifier));
    }

    public Session refresh(String refreshToken) {
        return token("refresh_token", Map.of("refresh_token", refreshToken));
    }

    /** Revokes the refresh tokens. Issued access tokens stay valid until they expire. */
    public void logout(String accessToken) {
        try {
            client.post().uri("/logout?scope=local").header("Authorization", "Bearer " + accessToken).retrieve().toBodilessEntity();
        } catch (RestClientResponseException ignored) {
            // Already signed out or expired: the cookies are cleared either way.
        }
    }

    private Session token(String grant, Map<String, String> body) {
        try {
            Map<?, ?> response = client.post().uri("/token?grant_type=" + grant)
                .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(Map.class);
            if (response == null || !(response.get("access_token") instanceof String access)
                || !(response.get("refresh_token") instanceof String refresh)) return null;
            return new Session(access, refresh);
        } catch (RestClientResponseException rejected) {
            if (rejected.getStatusCode().value() == 400 || rejected.getStatusCode().value() == 401 || rejected.getStatusCode().value() == 403) return null;
            throw rejected;
        }
    }
}
