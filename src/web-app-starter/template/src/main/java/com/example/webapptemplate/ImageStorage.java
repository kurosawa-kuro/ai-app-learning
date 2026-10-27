package com.example.webapptemplate;

import java.time.Duration;
import java.net.http.HttpClient;
import java.util.Map;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestClientException;

@Component
class ImageStorage {
    private final AppSettings settings;
    private final String bucket;
    private final RestClient client;
    ImageStorage(AppSettings settings,
                 @Value("${app.storage.url}") String url,
                 @Value("${app.storage.key}") String key,
                 @Value("${app.storage.bucket}") String bucket) {
        this.settings = settings;
        this.bucket = bucket;
        if (!url.matches("https://[a-z0-9]+\\.supabase\\.co") || !key.startsWith("sb_secret_")
                || !bucket.matches("[a-z0-9][a-z0-9-]{2,62}"))
            { this.client = null; return; }
        var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build());
        factory.setReadTimeout(Duration.ofSeconds(30));
        this.client = RestClient.builder().baseUrl(url + "/storage/v1").requestFactory(factory)
                .defaultHeader("apikey", key).build();
    }
    boolean enabled() { return settings.imagesEnabled() && configured(); }
    boolean configured() { return client != null; }
    String bucket() { return bucket; }
    void requireEnabled() {
        if (!settings.imagesEnabled()) throw new IllegalArgumentException("画像投稿はOFFです。画像なしで投稿してください。");
        requireConfigured();
    }
    private void requireConfigured() {
        if (!configured()) throw new IllegalStateException("画像ストレージの接続情報が未設定です。提供者に設定を依頼してください。");
    }

    synchronized void ensureBucket() {
        requireConfigured();
        try {
            Map<?, ?> info = client.get().uri("/bucket/{bucket}", bucket).retrieve().body(Map.class);
            if (info == null || !Boolean.FALSE.equals(info.get("public")))
                throw new IllegalStateException("画像用バケットは非公開にしてください。");
        } catch (RestClientResponseException e) {
            // Storage versions may report a missing bucket as HTTP 400 with statusCode=404.
            if (e.getStatusCode().value() != 404 && !(e.getStatusCode().value() == 400 && e.getResponseBodyAsString().contains("Bucket not found")))
                throw unavailable();
            try {
                client.post().uri("/bucket").contentType(MediaType.APPLICATION_JSON)
                        .body(Map.of("id", bucket, "name", bucket, "public", false,
                                "file_size_limit", ImageValidator.MAX_BYTES,
                                "allowed_mime_types", List.of("image/jpeg", "image/png")))
                        .retrieve().toBodilessEntity();
            } catch (RestClientException failure) { throw unavailable(); }
        } catch (RestClientException e) { throw unavailable(); }
    }
    void upload(String key, ImageValidator.Image image) {
        ensureBucket();
        try {
            client.post().uri("/object/{bucket}/{key}", bucket, key)
                    .contentType(MediaType.parseMediaType(image.type())).header("x-upsert", "false")
                    .body(image.bytes()).retrieve().toBodilessEntity();
        } catch (RestClientException e) { throw unavailable(); }
    }
    byte[] download(String storedBucket, String key) {
        requireConfigured();
        try { return client.get().uri("/object/authenticated/{bucket}/{key}", storedBucket, key).retrieve().body(byte[].class); }
        catch (RestClientException e) { throw unavailable(); }
    }
    void delete(String storedBucket, String key) {
        requireConfigured();
        try {
            client.method(org.springframework.http.HttpMethod.DELETE).uri("/object/{bucket}", storedBucket)
                    .contentType(MediaType.APPLICATION_JSON).body(Map.of("prefixes", List.of(key)))
                    .retrieve().toBodilessEntity();
        } catch (RestClientException e) { throw unavailable(); }
    }
    private IllegalStateException unavailable() {
        // Keep credentials, upstream response bodies and internal URLs out of UI/log messages.
        return new IllegalStateException("画像ストレージに接続できませんでした。設定を確認して再試行してください。");
    }
}
