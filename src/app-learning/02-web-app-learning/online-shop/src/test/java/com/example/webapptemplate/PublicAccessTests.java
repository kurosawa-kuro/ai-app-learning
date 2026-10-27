package com.example.webapptemplate;
import java.net.URI;
import java.net.http.*;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties="app.environment=production")
class PublicAccessTests {
 @LocalServerPort int port;
 @Test void educationPagesNeedNoLoginButWritesStillRequireCsrf() throws Exception {
  var client=HttpClient.newHttpClient();String root="http://127.0.0.1:"+port;
  for(String path:new String[]{"/posts","/admin","/admin/settings","/admin/ai","/healthz"})
   assertThat(client.send(HttpRequest.newBuilder(URI.create(root+path)).GET().build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
  assertThat(client.send(HttpRequest.newBuilder(URI.create(root+"/admin/settings")).POST(HttpRequest.BodyPublishers.ofString("imagePosting=true")).build(),HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(403);
 }
 @Test void allStylesheetsAreShippedAndContentVersioned() throws Exception {
  var client=HttpClient.newHttpClient();String root="http://127.0.0.1:"+port;
  var html=client.send(HttpRequest.newBuilder(URI.create(root+"/posts")).GET().build(),HttpResponse.BodyHandlers.ofString()).body();
  var links=java.util.regex.Pattern.compile("<link rel=\"stylesheet\" href=\"([^\"]+)\"").matcher(html);int count=0;
  while(links.find()) {
   String href=links.group(1);assertThat(href).containsPattern("-[a-f0-9]{32}\\.css$");
   var css=client.send(HttpRequest.newBuilder(URI.create(root+href)).GET().build(),HttpResponse.BodyHandlers.ofString());
   assertThat(css.statusCode()).isEqualTo(200);assertThat(css.headers().firstValue("content-type").orElse("")).startsWith("text/css");
   assertThat(css.headers().firstValue("cache-control").orElse("")).contains("max-age=31536000");count++;
  }
  assertThat(count).isEqualTo(6);
 }
 @Test void csrfCookieSurvivesLossOfServerSessionButMissingCookieIsRejected() throws Exception {
  var cookies=new java.net.CookieManager(null,java.net.CookiePolicy.ACCEPT_ALL);
  var client=HttpClient.newBuilder().cookieHandler(cookies).build();String root="http://127.0.0.1:"+port;
  var response=client.send(HttpRequest.newBuilder(URI.create(root+"/csrf")).GET().build(),HttpResponse.BodyHandlers.ofString());
  var match=java.util.regex.Pattern.compile("\"token\":\"([^\"]+)\"").matcher(response.body());
  assertThat(match.find()).isTrue();String token=match.group(1);
  assertThat(cookies.getCookieStore().getCookies()).anyMatch(cookie -> cookie.getName().equals("XSRF-TOKEN") && cookie.isHttpOnly());
  for(var uri:cookies.getCookieStore().getURIs())
   for(var cookie:java.util.List.copyOf(cookies.getCookieStore().get(uri)))
    if(!cookie.getName().equals("XSRF-TOKEN")) cookies.getCookieStore().remove(uri,cookie);
  var post=HttpRequest.newBuilder(URI.create(root+"/posts")).header("Content-Type","application/x-www-form-urlencoded")
   .header("X-CSRF-TOKEN",token).POST(HttpRequest.BodyPublishers.ofString("title=&body=")).build();
  assertThat(client.send(post,HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(200);
  cookies.getCookieStore().removeAll();
  assertThat(client.send(post,HttpResponse.BodyHandlers.discarding()).statusCode()).isEqualTo(403);
 }
}
