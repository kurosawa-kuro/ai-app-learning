package com.example.webapptemplate;
import com.example.webapptemplate.shell.internal.adapter.web.PageContext;
import com.example.webapptemplate.authors.*;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.settings.SettingsOperations;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.ui.ExtendedModelMap;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;
class PageContextPerformanceTests {
 @Test void imagesAndAsyncFormsDoNotLoadLayoutData() {
  var users=mock(AuthorOperations.class);var images=mock(ImageStore.class);var settings=mock(SettingsOperations.class);var icons=mock(UserIcons.class);
  var context=new PageContext(users,images,settings,icons);
  for(String path:new String[]{"/posts/00000000-0000-0000-0000-000000000000/image","/admin/users/00000000-0000-0000-0000-000000000000/icon"}) {
   var request=new MockHttpServletRequest("GET",path);
   context.selectedUser(null,new ExtendedModelMap(),request);
   assertThat(context.userIconIds(request)).isEmpty();assertThat(context.imagesEnabled(request)).isFalse();
  }
  var request=new MockHttpServletRequest("POST","/posts");request.addHeader("X-UI-Form","true");
  context.selectedUser(null,new ExtendedModelMap(),request);context.userIconIds(request);context.imagesEnabled(request);
  verifyNoInteractions(users,images,settings,icons);
 }
}
