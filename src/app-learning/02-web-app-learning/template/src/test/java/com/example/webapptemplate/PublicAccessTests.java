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
        for(var path:new String[]{"/posts","/admin","/admin/operations","/admin/exports/posts.csv"}) {
            assertThat(client.send(HttpRequest.newBuilder(URI.create(root+path)).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(401);
        }
        String correct="Basic "+Base64.getEncoder().encodeToString("acceptance:only-a-local-test-password-12345".getBytes(java.nio.charset.StandardCharsets.UTF_8));
        assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/admin")).header("Authorization",correct).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
        assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/posts")).header("Authorization","Basic "+Base64.getEncoder().encodeToString("acceptance:wrong".getBytes())).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(401);
        assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/admin/settings")).header("Authorization",correct).POST(HttpRequest.BodyPublishers.ofString("imagePosting=true")).build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isIn(401,403);
    }
}
