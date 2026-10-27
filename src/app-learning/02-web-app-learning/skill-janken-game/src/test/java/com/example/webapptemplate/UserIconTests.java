package com.example.webapptemplate;

import com.example.webapptemplate.platform.ImageCleanup;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.ImageUpload;
import com.example.webapptemplate.platform.internal.adapter.image.ImageIoCodec;
import com.example.webapptemplate.platform.internal.adapter.persistence.SpringUnitOfWork;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.authors.internal.application.AuthorService;
import com.example.webapptemplate.authors.internal.application.AuthorStore;
import com.example.webapptemplate.authors.internal.application.IconStore;
import com.example.webapptemplate.authors.internal.application.UserIconService;
import com.example.webapptemplate.bootstrap.internal.adapter.persistence.SeedFixtures;

import java.io.ByteArrayInputStream;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
    "spring.datasource.hikari.schema=skill_janken_game_seed_test",
    "spring.flyway.schemas=skill_janken_game_seed_test",
    "spring.flyway.default-schema=skill_janken_game_seed_test"
})
class UserIconTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate transaction;
    @Autowired AuthorStore authorStore;
    @Autowired IconStore iconStore;
    AuthorOperations repository;
    ImageCleanup cleanup;
    ImageStore storage;
    UserIconService service;
    UUID user;
    ImageUpload file;

    @BeforeEach void setup() {
        assertThat(jdbc.queryForObject("select current_schema()", String.class)).isEqualTo("skill_janken_game_seed_test");
        jdbc.update("delete from posts"); jdbc.update("delete from app_users"); jdbc.update("delete from image_cleanup");
        storage = mock(ImageStore.class); when(storage.bucket()).thenReturn("icons-test");
        cleanup = TestInfrastructure.cleanup(jdbc, storage);
        var tx = new SpringUnitOfWork(transaction);
        repository = new AuthorService(authorStore, iconStore, tx, cleanup);
        service = new UserIconService(authorStore, iconStore, tx, storage, new ImageIoCodec(), cleanup);
        user = repository.addAuthor("アイコン検証");
        file = new ImageUpload(SeedFixtures.image("focus").bytes());
    }

    @Test void cropsToSquareReplacesAndRemovesOnlyTheIcon() throws Exception {
        var square = new ImageIoCodec().square(new ImageIoCodec().read(file));
        var image = ImageIO.read(new ByteArrayInputStream(square.bytes()));
        assertThat(image.getWidth()).isEqualTo(256); assertThat(image.getHeight()).isEqualTo(256);
        assertThat(service.save(user, file)).isZero();
        var original = service.icon(user).orElseThrow();
        assertThat(service.save(user, file)).isZero();
        assertThat(service.icon(user).orElseThrow().key()).isNotEqualTo(original.key());
        verify(storage).delete(original.bucket(), original.key());
        assertThat(service.remove(user)).isZero();
        assertThat(service.icon(user)).isEmpty(); assertThat(repository.author(user)).isPresent();
    }

    @Test void failedUploadKeepsTheExistingIconAndRetriesCleanup() {
        service.save(user, file); var original = service.icon(user).orElseThrow();
        doThrow(new IllegalStateException("offline")).when(storage).upload(anyString(), any());
        doThrow(new IllegalStateException("offline")).when(storage).delete(anyString(), anyString());
        assertThatThrownBy(() -> service.save(user, file)).isInstanceOf(IllegalStateException.class);
        assertThat(service.icon(user).orElseThrow()).isEqualTo(original);
        assertThat(TestInfrastructure.cleanup(jdbc, storage).pending()).isEqualTo(1);
        doNothing().when(storage).delete(anyString(), anyString());
        assertThat(TestInfrastructure.cleanup(jdbc, storage).run()).isZero();
        verify(storage, never()).delete(original.bucket(), original.key());
    }

    @Test void usersWithPostsCannotBeDeletedAndReferencedIconsAreNeverCleaned() {
        service.save(user, file); var icon = service.icon(user).orElseThrow();
        jdbc.update("insert into posts(id,user_id,title) values (?,?, '残す投稿')", UUID.randomUUID(), user);
        assertThatThrownBy(() -> repository.deleteAuthor(user)).isInstanceOf(IllegalArgumentException.class).hasMessageContaining("利用中");
        assertThat(repository.author(user)).isPresent(); assertThat(service.icon(user)).contains(icon);
        var cleanup = TestInfrastructure.cleanup(jdbc, storage); cleanup.enqueue(icon.bucket(), icon.key());
        assertThat(cleanup.run()).isEqualTo(1);
        verify(storage, never()).delete(icon.bucket(), icon.key());
    }

    @Test void deletingAUserQueuesItsIconAndInvalidInputDoesNotUpload() {
        assertThatThrownBy(() -> service.save(user, new ImageUpload(new byte[]{1, 2})))
            .isInstanceOf(IllegalArgumentException.class);
        verify(storage, never()).upload(anyString(), any());
        service.save(user, file); var icon = service.icon(user).orElseThrow();
        repository.deleteAuthor(user);
        assertThat(repository.author(user)).isEmpty(); assertThat(service.icon(user)).isEmpty();
        verify(storage).delete(icon.bucket(), icon.key());
    }
}
