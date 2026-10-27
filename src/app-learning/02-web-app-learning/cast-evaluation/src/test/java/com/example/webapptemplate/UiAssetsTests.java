package com.example.webapptemplate;
import com.example.webapptemplate.shell.internal.adapter.web.UiContext;
import org.springframework.mock.web.MockHttpServletRequest;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;
class UiAssetsTests {
 @Test void eachScreenLoadsOnlyItsOwnScriptsIncludingIconPreview() {
  var ui=new UiContext();
  assertThat(ui.scripts(new MockHttpServletRequest("GET","/admin/settings"))).isEmpty();
  assertThat(ui.scripts(new MockHttpServletRequest("GET","/admin/users/00000000-0000-0000-0000-000000000000/icon/edit"))).containsExactly("/ui/image-preview.js");
  assertThat(ui.scripts(new MockHttpServletRequest("GET","/posts"))).containsExactly("/features/posts/feed.js");
  assertThat(ui.scripts(new MockHttpServletRequest("GET","/posts/00000000-0000-0000-0000-000000000000"))).containsExactly("/features/posts/feed.js");
  assertThat(ui.scripts(new MockHttpServletRequest("GET","/posts/new"))).contains("/features/ai/drafts.js","/ui/form-protection.js");
  assertThat(ui.scripts(new MockHttpServletRequest("GET","/examples/skill-janken"))).containsExactly("/examples/janken-rules.js","/examples/skill-janken.js");
 }
}
