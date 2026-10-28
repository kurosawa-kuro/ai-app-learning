package com.example.webapptemplate;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.ECDSASigner;
import com.nimbusds.jose.jwk.Curve;
import com.nimbusds.jose.jwk.ECKey;
import com.nimbusds.jose.jwk.gen.ECKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.HttpCookie;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import static org.assertj.core.api.Assertions.assertThat;

/** Google sign-in through a local stand-in for Supabase Auth: JWKS, PKCE exchange, refresh and logout. */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = {"app.auth.enabled=true", "app.auth.publishable-key=test-publishable-key", "app.auth.callback-url=http://localhost:8080/auth/callback"})
class AuthTests {
    private static final String ADMIN = "auth-test-admin@example.com";
    private static final String STRANGER = "auth-test-stranger@example.com";
    private static final ECKey KEY;
    private static final java.util.Map<String, String> CODES = new java.util.concurrent.ConcurrentHashMap<>();
    private static volatile String logoutQuery;
    private static final HttpServer AUTH;
    static {
        try {
            KEY = new ECKeyGenerator(Curve.P_256).keyID("test-key").generate();
            AUTH = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        } catch (Exception failure) { throw new ExceptionInInitializerError(failure); }
        AUTH.createContext("/auth/v1/.well-known/jwks.json", exchange ->
            send(exchange, 200, "{\"keys\":[" + KEY.toPublicJWK().toJSONString() + "]}"));
        AUTH.createContext("/auth/v1/token", AuthTests::token);
        AUTH.createContext("/auth/v1/logout", exchange -> { logoutQuery = exchange.getRequestURI().getQuery(); send(exchange, 204, ""); });
        AUTH.start();
    }
    @DynamicPropertySource static void auth(DynamicPropertyRegistry registry) {
        registry.add("app.auth.url", () -> "http://127.0.0.1:" + AUTH.getAddress().getPort());
    }

    @LocalServerPort int port;
    @Autowired JdbcTemplate jdbc;
    @Autowired org.springframework.security.oauth2.jwt.JwtDecoder decoder;
    @Autowired com.example.webapptemplate.auth.internal.AuthProperties properties;

    @AfterEach void removeAdmins() {
        jdbc.update("DELETE FROM app_admins WHERE email IN (?, ?)", ADMIN, STRANGER);
    }

    @Test void onlyLoginAssetsAndHealthAreOpenBeforeSignIn() throws Exception {
        var client = HttpClient.newHttpClient();
        for (String path : new String[]{"/posts", "/admin", "/admin/settings", "/csrf"})
            assertThat(client.send(get(path), HttpResponse.BodyHandlers.discarding()).headers().firstValue("location").orElse(""))
                .as(path).endsWith("/login");
        var login = client.send(get("/login"), HttpResponse.BodyHandlers.ofString());
        assertThat(login.statusCode()).isEqualTo(200);
        assertThat(login.body()).contains("Googleでログイン");
        var css = Pattern.compile("href=\"(/vendor/pico/[^\"]+\\.css)\"").matcher(login.body());
        assertThat(css.find()).isTrue();
        assertThat(client.send(get(css.group(1)), HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
        assertThat(client.send(get("/healthz"), HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
    }

    @Test void googleSignInUsesPkceAndAdmitsListedAdmins() throws Exception {
        jdbc.update("INSERT INTO app_admins(email, note) VALUES (?, 'test')", ADMIN);
        var cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        var client = HttpClient.newBuilder().cookieHandler(cookies).build();
        var start = client.send(get("/auth/google"), HttpResponse.BodyHandlers.discarding());
        String location = start.headers().firstValue("location").orElse("");
        assertThat(location).startsWith(authUrl() + "/auth/v1/authorize?provider=google")
            .contains("code_challenge=").contains("code_challenge_method=s256").contains("redirect_to=http://localhost:8080/auth/callback");
        registerCode(start, ADMIN);
        var callback = client.send(get("/auth/callback?code=code-" + ADMIN), HttpResponse.BodyHandlers.discarding());
        assertThat(callback.headers().firstValue("location").orElse("")).endsWith(properties.getHome());
        assertThat(properties.getHome()).matches("/[a-zA-Z0-9/_-]*");
        assertThat(cookie(cookies, "app_access")).isNotBlank();
        var page = client.send(get("/posts"), HttpResponse.BodyHandlers.ofString());
        assertThat(page.statusCode()).isEqualTo(200);
        assertThat(page.body()).contains("ログイン中のアカウント").contains("テスト管理者");
    }

    @Test void signedInAccountsOutsideTheAdminListAreRefused() throws Exception {
        var cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        var client = HttpClient.newBuilder().cookieHandler(cookies).build();
        registerCode(client.send(get("/auth/google"), HttpResponse.BodyHandlers.discarding()), STRANGER);
        var callback = client.send(get("/auth/callback?code=code-" + STRANGER), HttpResponse.BodyHandlers.discarding());
        assertThat(callback.headers().firstValue("location").orElse("")).endsWith("/login?error=denied");
        assertThat(cookie(cookies, "app_access")).isEmpty();
        assertThat(client.send(get("/auth/callback?code=code-" + ADMIN), HttpResponse.BodyHandlers.discarding())
            .headers().firstValue("location").orElse("")).as("verifier is single use").endsWith("/login?error=failed");
    }

    @Test void expiredAccessTokenIsRefreshedOnceAndRevokedRefreshSignsOut() throws Exception {
        jdbc.update("INSERT INTO app_admins(email, note) VALUES (?, 'test')", ADMIN);
        var cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        var client = HttpClient.newBuilder().cookieHandler(cookies).build();
        put(cookies, "app_access", jwt(ADMIN, Instant.now().minusSeconds(60)));
        put(cookies, "app_refresh", "refresh-" + ADMIN);
        var page = client.send(get("/posts"), HttpResponse.BodyHandlers.discarding());
        assertThat(page.statusCode()).isEqualTo(200);
        assertThat(page.headers().allValues("set-cookie")).anyMatch(value -> value.startsWith("app_access=ey"));

        var revoked = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        put(revoked, "app_access", jwt(ADMIN, Instant.now().minusSeconds(60)));
        put(revoked, "app_refresh", "refresh-revoked");
        var out = HttpClient.newBuilder().cookieHandler(revoked).build().send(get("/posts"), HttpResponse.BodyHandlers.discarding());
        assertThat(out.headers().firstValue("location").orElse("")).endsWith("/login");
        assertThat(cleared(out, "app_refresh")).isTrue();
    }

    @Test void logoutNeedsCsrfAndClearsTheSession() throws Exception {
        jdbc.update("INSERT INTO app_admins(email, note) VALUES (?, 'test')", ADMIN);
        var cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        var client = HttpClient.newBuilder().cookieHandler(cookies).build();
        put(cookies, "app_access", jwt(ADMIN, Instant.now().plusSeconds(3600)));
        put(cookies, "app_refresh", "refresh-" + ADMIN);
        assertThat(client.send(post("/logout", null), HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(403);
        var csrf = Pattern.compile("\"token\":\"([^\"]+)\"").matcher(client.send(get("/csrf"), HttpResponse.BodyHandlers.ofString()).body());
        assertThat(csrf.find()).isTrue();
        // Pages fire other signed-in requests (user options, images) before the form is sent.
        var other = client.send(get("/admin/current-user"), HttpResponse.BodyHandlers.discarding());
        assertThat(other.headers().allValues("set-cookie")).as("CSRF token must not rotate per request")
            .noneMatch(value -> value.startsWith("XSRF-TOKEN="));
        var logout = client.send(post("/logout", csrf.group(1)), HttpResponse.BodyHandlers.discarding());
        assertThat(logout.headers().firstValue("location").orElse("")).endsWith("/login?logout");
        assertThat(logoutQuery).isEqualTo("scope=local");
        assertThat(cleared(logout, "app_access")).isTrue();
        assertThat(cleared(logout, "app_refresh")).isTrue();
    }

    @Test void rejectsWrongAudienceRoleAndMissingExpiry() {
        for (String token : new String[]{jwt(ADMIN, Instant.now().plusSeconds(3600), "other-app", "authenticated"),
                jwt(ADMIN, Instant.now().plusSeconds(3600), "authenticated", "service_role"), jwt(ADMIN, null)}) {
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> decoder.decode(token))
                .isInstanceOf(org.springframework.security.oauth2.jwt.JwtException.class);
        }
    }

    @Test void wrongPkceVerifierCannotExchangeCode() throws Exception {
        jdbc.update("INSERT INTO app_admins(email, note) VALUES (?, 'test')", ADMIN);
        var cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        var client = HttpClient.newBuilder().cookieHandler(cookies).build();
        registerCode(client.send(get("/auth/google"), HttpResponse.BodyHandlers.discarding()), ADMIN);
        cookies.getCookieStore().removeAll();
        put(cookies, "app_pkce", "a-different-browser-verifier");
        var callback = client.send(get("/auth/callback?code=code-" + ADMIN), HttpResponse.BodyHandlers.discarding());
        assertThat(callback.headers().firstValue("location").orElse("")).endsWith("/login?error=failed");
        assertThat(cookie(cookies, "app_access")).isEmpty();
    }

    @Test void temporaryRateLimitDoesNotDestroyRefreshCookie() throws Exception {
        var cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        put(cookies, "app_refresh", "refresh-busy");
        var response = HttpClient.newBuilder().cookieHandler(cookies).build()
            .send(get("/posts"), HttpResponse.BodyHandlers.discarding());
        assertThat(response.headers().firstValue("location").orElse("")).endsWith("/login");
        assertThat(cleared(response, "app_refresh")).isFalse();
    }

    @Test void expiredFormReturns401WithoutRedirectOrWriting() throws Exception {
        var cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        jdbc.update("INSERT INTO app_admins(email, note) VALUES (?, 'test')", ADMIN);
        put(cookies, "app_access", jwt(ADMIN, Instant.now().plusSeconds(3600)));
        var client = HttpClient.newBuilder().cookieHandler(cookies).build();
        var csrf = Pattern.compile("\"token\":\"([^\"]+)\"").matcher(client.send(get("/csrf"), HttpResponse.BodyHandlers.ofString()).body());
        assertThat(csrf.find()).isTrue();
        cookies.getCookieStore().getCookies().stream().filter(c -> c.getName().equals("app_access"))
            .toList().forEach(c -> cookies.getCookieStore().remove(URI.create("http://localhost:" + port), c));
        var response = client.send(post("/posts", csrf.group(1)), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(401);
        assertThat(response.headers().firstValue("location")).isEmpty();
        assertThat(response.body()).contains("入力内容を控えて");
    }

    private static void registerCode(HttpResponse<?> response, String email) {
        String query = URI.create(response.headers().firstValue("location").orElseThrow()).getRawQuery();
        for (String pair : query.split("&")) if (pair.startsWith("code_challenge="))
            CODES.put("code-" + email, java.net.URLDecoder.decode(pair.substring(15), StandardCharsets.UTF_8));
    }
    private static String challenge(String verifier) {
        try { return java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(
            java.security.MessageDigest.getInstance("SHA-256").digest(verifier.getBytes(StandardCharsets.US_ASCII))); }
        catch (Exception failure) { throw new IllegalStateException(failure); }
    }

    private HttpRequest get(String path) { return HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).GET().build(); }
    private HttpRequest post(String path, String csrf) {
        var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).POST(HttpRequest.BodyPublishers.noBody());
        if (csrf != null) builder.header("X-CSRF-TOKEN", csrf);
        return builder.build();
    }
    private void put(CookieManager cookies, String name, String value) {
        var cookie = new HttpCookie(name, value);
        cookie.setPath("/");
        cookie.setVersion(0);
        cookies.getCookieStore().add(URI.create("http://localhost:" + port + "/"), cookie);
    }
    private static String cookie(CookieManager cookies, String name) {
        return cookies.getCookieStore().getCookies().stream().filter(c -> c.getName().equals(name))
            .map(HttpCookie::getValue).findFirst().orElse("");
    }
    private static boolean cleared(HttpResponse<?> response, String name) {
        return response.headers().allValues("set-cookie").stream().anyMatch(value -> value.startsWith(name + "=;") && value.contains("Max-Age=0"));
    }
    private static String authUrl() { return "http://127.0.0.1:" + AUTH.getAddress().getPort(); }

    private static String jwt(String email, Instant expires) {
        return jwt(email, expires, "authenticated", "authenticated");
    }
    private static String jwt(String email, Instant expires, String audience, String role) {
        try {
            var claims = new JWTClaimsSet.Builder().issuer(authUrl() + "/auth/v1").subject(UUID.nameUUIDFromBytes(email.getBytes()).toString())
                .audience(audience).claim("role", role).claim("email", email).claim("is_anonymous", false)
                .claim("user_metadata", Map.of("full_name", "テスト管理者"))
                .issueTime(Date.from(Instant.now().minusSeconds(3600))).expirationTime(expires == null ? null : Date.from(expires)).build();
            var signed = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.ES256).keyID(KEY.getKeyID()).build(), claims);
            signed.sign(new ECDSASigner(KEY));
            return signed.serialize();
        } catch (Exception failure) { throw new IllegalStateException(failure); }
    }

    private static void token(HttpExchange exchange) throws IOException {
        if (!"test-publishable-key".equals(exchange.getRequestHeaders().getFirst("apikey"))) { send(exchange, 401, "{}"); return; }
        String body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        String query = exchange.getRequestURI().getQuery();
        String email = null;
        var code = Pattern.compile("\"auth_code\":\"code-([^\"]+)\"").matcher(body);
        var refresh = Pattern.compile("\"refresh_token\":\"refresh-([^\"]+)\"").matcher(body);
        if ("grant_type=pkce".equals(query) && code.find()) {
            var verifier = Pattern.compile("\"code_verifier\":\"([^\"]+)\"").matcher(body);
            String expected = CODES.remove("code-" + code.group(1));
            if (verifier.find() && expected != null && expected.equals(challenge(verifier.group(1)))) email = code.group(1);
        }
        if ("grant_type=refresh_token".equals(query) && refresh.find() && !refresh.group(1).equals("revoked")) email = refresh.group(1);
        if (body.contains("refresh-busy")) { send(exchange, 429, "{}"); return; }
        if (email == null) { send(exchange, 400, "{\"error\":\"invalid_grant\"}"); return; }
        send(exchange, 200, "{\"access_token\":\"" + jwt(email, Instant.now().plusSeconds(3600))
            + "\",\"token_type\":\"bearer\",\"expires_in\":3600,\"refresh_token\":\"refresh-" + email + "\"}");
    }

    private static void send(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.getResponseHeaders().add("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, status == 204 ? -1 : bytes.length);
        if (status != 204) exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
