package com.example.webapptemplate;

import java.net.URI;
import java.net.http.*;
import java.util.Base64;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.annotation.DirtiesContext;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "app.environment=production","app.access.mode=basic","app.access.user=acceptance",
    "app.access.password=only-a-local-test-password-12345"})
@DirtiesContext
class PublicAccessTests {
    @LocalServerPort int port;
    @Test void publicProfileRejectsAnonymousAndWrongCredentialsAndKeepsCsrf() throws Exception {
        var client=HttpClient.newHttpClient(); String root="http://127.0.0.1:"+port;
        for(var path:new String[]{"/posts","/admin","/admin/operations","/admin/exports/posts.csv","/admin/ai","/ai/drafts/00000000-0000-0000-0000-000000000000"}) {
            assertThat(client.send(HttpRequest.newBuilder(URI.create(root+path)).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(401);
        }
        String correct="Basic "+Base64.getEncoder().encodeToString("acceptance:only-a-local-test-password-12345".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/admin")).header("Authorization",correct).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
        assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/posts")).header("Authorization","Basic "+Base64.getEncoder().encodeToString("acceptance:wrong".getBytes())).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(401);
        assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/admin/settings")).header("Authorization",correct).POST(HttpRequest.BodyPublishers.ofString("imagePosting=true")).build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isIn(401,403);
    }
    @Test void authenticationIsReusedForAssetsWithoutRepeatingBasicCredentials() throws Exception {
        var cookies=new java.net.CookieManager();
        var client=HttpClient.newBuilder().cookieHandler(cookies).build();
        String root="http://127.0.0.1:"+port;
        String auth="Basic "+Base64.getEncoder().encodeToString("acceptance:only-a-local-test-password-12345".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/admin")).header("Authorization",auth).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
        var html=client.send(HttpRequest.newBuilder(URI.create(root+"/posts")).GET().build(),HttpResponse.BodyHandlers.ofString()).body();
        var asset=java.util.regex.Pattern.compile("/ui/ui-[a-f0-9]{32}\\.css").matcher(html);
        assertThat(asset.find()).as("content-versioned stylesheet").isTrue();
        var cached=client.send(HttpRequest.newBuilder(URI.create(root+asset.group())).GET().build(),HttpResponse.BodyHandlers.discarding());
        assertThat(cached.statusCode()).isEqualTo(200);
        assertThat(cached.headers().firstValue("cache-control").orElse("")).contains("max-age=31536000");
        assertThat(cookies.getCookieStore().getCookies()).anyMatch(cookie->cookie.getName().equals("JSESSIONID"));
        assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/ui/ui.css")).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
        assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/admin/ai")).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
        assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/admin/settings")).POST(HttpRequest.BodyPublishers.noBody()).build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(403);
    }
}
