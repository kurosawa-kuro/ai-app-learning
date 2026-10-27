package com.example.webapptemplate;

import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.posts.PostOperations;
import com.example.webapptemplate.posts.internal.adapter.web.PostController;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.web.servlet.mvc.support.RedirectAttributesModelMap;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class PostFormTests {
    @Test
    void validationPreservesDraftAndIdentifiesEachInvalidField() {
        var repository = mock(AuthorOperations.class);
        when(repository.authors()).thenReturn(List.of());
        var service = mock(PostOperations.class);
        var controller = new PostController(repository, service, mock(ImageStore.class));
        var model = new ExtendedModelMap();
        assertThat(controller.create(null, "  ", "本文", null, model, new MockHttpServletRequest(),
                new MockHttpServletResponse(), new RedirectAttributesModelMap())).isEqualTo("posts/form");
        assertThat(model.get("form")).isEqualTo(new PostController.PostForm(null, "  ", "本文"));
        assertThat((java.util.Map<?, ?>)model.get("fieldErrors")).hasSize(2);
        verifyNoInteractions(service);
    }

    @Test
    void databaseFailurePreservesNativeFormAndReturnsRecoverableAsyncError() {
        var repository = mock(AuthorOperations.class);
        when(repository.authors()).thenReturn(List.of());
        var service = mock(PostOperations.class);
        var author = UUID.randomUUID();
        when(service.create(author, "下書き", "残す本文", null))
                .thenThrow(new DataAccessResourceFailureException("private database diagnostics"));
        var controller = new PostController(repository, service, mock(ImageStore.class));
        var model = new ExtendedModelMap();
        assertThat(controller.create(author, "下書き", "残す本文", null, model, new MockHttpServletRequest(),
                new MockHttpServletResponse(), new RedirectAttributesModelMap())).isEqualTo("posts/form");
        assertThat(model.get("form")).isEqualTo(new PostController.PostForm(author, "下書き", "残す本文"));
        assertThat(model.get("error").toString()).contains("入力内容は残っています").doesNotContain("private");
        var result = controller.createAsync(author, "下書き", "残す本文", null, new MockHttpServletRequest(), new MockHttpServletResponse());
        assertThat(result.getStatusCode().value()).isEqualTo(422);
        assertThat(result.getBody().toString()).contains("入力内容は残っています").doesNotContain("private");
    }
}
