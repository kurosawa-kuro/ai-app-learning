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
        var service = new PostService(repository, storage, validator, tx, mock(AuthorOperations.class), mock(FeaturePolicy.class), mock(com.example.webapptemplate.platform.ImageCleanup.class), com.example.webapptemplate.platform.AuditTrail.NONE);
        assertThatThrownBy(() -> service.create(UUID.randomUUID(), "投稿", "", file)).hasMessage("database unavailable");
        var key = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(storage).upload(key.capture(), any());
        verify(storage).delete("test-bucket", key.getValue());
    }
    @Test
    void queuesImageDeletionWithTheDatabaseDeleteBeforeRetryingStorage() {
        var repository = mock(PostStore.class);
        var storage = mock(ImageStore.class);
        var id = UUID.randomUUID();
        when(repository.post(id)).thenReturn(new PostView(id, UUID.randomUUID(), "", "", "", "test", "object.png", "image/png", null));
        var tx=mock(UnitOfWork.class);
        doAnswer(call -> { ((Runnable)call.getArgument(0)).run(); return null; }).when(tx).run(any());
        var cleanup=mock(com.example.webapptemplate.platform.ImageCleanup.class);
        when(cleanup.run()).thenReturn(1);
        var service = new PostService(repository, storage, mock(ImageCodec.class), tx, mock(AuthorOperations.class), mock(FeaturePolicy.class), cleanup, com.example.webapptemplate.platform.AuditTrail.NONE);
        service.delete(id);
        verify(cleanup).enqueue("test","object.png");
        verify(repository).deletePost(id);
        verify(cleanup).run();
        verifyNoInteractions(storage);
    }
    @Test
    void rejectsImageWhenOptionIsDisabled() {
        var storage = new SupabaseImageStore("", "", "unused");
        var service = new PostService(mock(PostStore.class), storage, new ImageIoCodec(), mock(UnitOfWork.class), mock(AuthorOperations.class), mock(FeaturePolicy.class, CALLS_REAL_METHODS), mock(com.example.webapptemplate.platform.ImageCleanup.class), com.example.webapptemplate.platform.AuditTrail.NONE);
        assertThatThrownBy(() -> service.create(UUID.randomUUID(), "投稿", "", new ImageUpload(new byte[]{1})))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("OFF");
    }
}
