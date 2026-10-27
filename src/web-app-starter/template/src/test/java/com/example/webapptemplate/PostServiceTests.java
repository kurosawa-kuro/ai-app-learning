package com.example.webapptemplate;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.support.TransactionTemplate;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;
import static org.assertj.core.api.Assertions.*;

class PostServiceTests {
    @Test
    void removesUploadedObjectIfDatabaseWriteFails() {
        var repository = mock(PostRepository.class);
        var storage = mock(ImageStorage.class);
        var validator = mock(ImageValidator.class);
        var tx = mock(TransactionTemplate.class);
        var file = new MockMultipartFile("image", new byte[]{1});
        when(validator.read(file)).thenReturn(new ImageValidator.Image(new byte[]{1}, "image/png", "png"));
        when(storage.bucket()).thenReturn("test-bucket");
        doThrow(new IllegalStateException("database unavailable")).when(tx).executeWithoutResult(any());
        var service = new PostService(repository, storage, validator, tx);
        assertThatThrownBy(() -> service.create(UUID.randomUUID(), "投稿", "", file)).hasMessage("database unavailable");
        var key = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(storage).upload(key.capture(), any());
        verify(storage).delete("test-bucket", key.getValue());
    }
    @Test
    void keepsPostIfImageDeletionFailsSoItCanBeRetried() {
        var repository = mock(PostRepository.class);
        var storage = mock(ImageStorage.class);
        var id = UUID.randomUUID();
        when(repository.post(id)).thenReturn(new PostRepository.Post(id, UUID.randomUUID(), "", "", "", "test", "object.png", "image/png", null));
        doThrow(new IllegalStateException("storage unavailable")).when(storage).delete("test", "object.png");
        var service = new PostService(repository, storage, mock(ImageValidator.class), mock(TransactionTemplate.class));
        assertThatThrownBy(() -> service.delete(id)).hasMessage("storage unavailable");
        verify(repository, never()).deletePost(any());
    }
    @Test
    void rejectsImageWhenOptionIsDisabled() {
        var storage = new ImageStorage(mock(AppSettings.class), "", "", "unused");
        var service = new PostService(mock(PostRepository.class), storage, new ImageValidator(), mock(TransactionTemplate.class));
        assertThatThrownBy(() -> service.create(UUID.randomUUID(), "投稿", "", new MockMultipartFile("image", new byte[]{1})))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("OFF");
    }
}
