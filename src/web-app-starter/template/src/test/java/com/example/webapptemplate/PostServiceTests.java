package com.example.webapptemplate;

import com.example.webapptemplate.platform.ImageCodec;
import com.example.webapptemplate.platform.ImageData;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.ImageUpload;
import com.example.webapptemplate.platform.UnitOfWork;
import com.example.webapptemplate.platform.internal.adapter.image.ImageIoCodec;
import com.example.webapptemplate.platform.internal.adapter.storage.SupabaseImageStore;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.posts.PostView;
import com.example.webapptemplate.posts.internal.application.PostService;
import com.example.webapptemplate.posts.internal.application.PostStore;
import com.example.webapptemplate.settings.FeaturePolicy;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;

class PostServiceTests {
    @Test
    void removesUploadedObjectIfDatabaseWriteFails() {
        var repository = mock(PostStore.class);
        var storage = mock(ImageStore.class);
        var validator = mock(ImageIoCodec.class);
        var tx = mock(UnitOfWork.class);
        var file = new ImageUpload(new byte[]{1});
        when(validator.read(file)).thenReturn(new ImageData(new byte[]{1}, "image/png", "png"));
        when(storage.bucket()).thenReturn("test-bucket");
        doThrow(new IllegalStateException("database unavailable")).when(tx).run(any());
        var service = new PostService(repository, storage, validator, tx, mock(AuthorOperations.class), mock(FeaturePolicy.class));
        assertThatThrownBy(() -> service.create(UUID.randomUUID(), "投稿", "", file)).hasMessage("database unavailable");
        var key = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(storage).upload(key.capture(), any());
        verify(storage).delete("test-bucket", key.getValue());
    }
    @Test
    void keepsPostIfImageDeletionFailsSoItCanBeRetried() {
        var repository = mock(PostStore.class);
        var storage = mock(ImageStore.class);
        var id = UUID.randomUUID();
        when(repository.post(id)).thenReturn(new PostView(id, UUID.randomUUID(), "", "", "", "test", "object.png", "image/png", null));
        doThrow(new IllegalStateException("storage unavailable")).when(storage).delete("test", "object.png");
        var service = new PostService(repository, storage, mock(ImageCodec.class), mock(UnitOfWork.class), mock(AuthorOperations.class), mock(FeaturePolicy.class));
        assertThatThrownBy(() -> service.delete(id)).hasMessage("storage unavailable");
        verify(repository, never()).deletePost(any());
    }
    @Test
    void rejectsImageWhenOptionIsDisabled() {
        var storage = new SupabaseImageStore("", "", "unused");
        var service = new PostService(mock(PostStore.class), storage, new ImageIoCodec(), mock(UnitOfWork.class), mock(AuthorOperations.class), mock(FeaturePolicy.class, CALLS_REAL_METHODS));
        assertThatThrownBy(() -> service.create(UUID.randomUUID(), "投稿", "", new ImageUpload(new byte[]{1})))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("OFF");
    }
}
