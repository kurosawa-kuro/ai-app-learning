package com.example.webapptemplate;
import com.example.webapptemplate.bootstrap.internal.adapter.persistence.SeedFixtures;
import com.example.webapptemplate.posts.PostOperations;

import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.settings.internal.application.SettingsService;
import com.example.webapptemplate.settings.internal.adapter.persistence.JdbcSettingsStore;
import com.example.webapptemplate.bootstrap.internal.adapter.persistence.SeedDataService;

import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
    "spring.datasource.hikari.schema=english_trainer_seed_test",
    "spring.flyway.schemas=english_trainer_seed_test",
    "spring.flyway.default-schema=english_trainer_seed_test"
})
class SeedDataTests {
    @Autowired PostOperations posts;
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate transaction;
    @Autowired JdbcSettingsStore settings;
    @Autowired AuthorOperations authors;
    ImageStore storage;
    SeedDataService seed;

    @BeforeEach void setup() {
        assertThat(jdbc.queryForObject("select current_schema()", String.class)).isEqualTo("english_trainer_seed_test");
        jdbc.execute("alter table posts drop constraint if exists seed_test_reject");
        jdbc.update("delete from posts");
        jdbc.update("delete from image_cleanup");
        jdbc.update("delete from app_users");
        settings.saveFeatures(true, true);
        storage = mock(ImageStore.class);
        when(storage.bucket()).thenReturn("seed-test-bucket");
        seed = new SeedDataService(jdbc, transaction, storage, new SettingsService(settings, storage), TestInfrastructure.cleanup(jdbc, storage));
    }

    UUID oldPost() {
        var user = UUID.randomUUID(); var post = UUID.randomUUID();
        jdbc.update("insert into app_users(id,name) values (?, '既存ユーザー')", user);
        authors.saveDefaultUser(user);
        jdbc.update("insert into posts(id,user_id,title,image_bucket,image_key,image_type) values (?,?, '既存投稿','old-bucket','old.png','image/png')", post, user);
        return post;
    }

    @Test void resetReplacesOnlyPostsAndAddIsIdempotent() {
        var old = oldPost(); var defaultUser = authors.defaultUserId();
        var result = seed.seed(true);
        assertThat(result).isEqualTo(new SeedDataService.Result(1, 12, 4, 0));
        assertThat(seed.exists(old)).isFalse();
        assertThat(authors.defaultUserId()).isEqualTo(defaultUser);
        assertThat(settings.aiEnabled()).isTrue();
        assertThat(settings.imagesEnabled()).isTrue();
        assertThat(jdbc.queryForObject("select count(*) from app_users", Integer.class)).isEqualTo(4);
        verify(storage).delete("old-bucket", "old.png");
        clearInvocations(storage);
        assertThat(seed.seed(false)).isEqualTo(new SeedDataService.Result(0, 0, 0, 0));
        verifyNoInteractions(storage);
        assertThat(jdbc.queryForObject("select count(*) from posts", Integer.class)).isEqualTo(12);
        assertThat(posts.page(null, 1).items()).hasSize(10);
        assertThat(posts.page(null, 1).hasNext()).isTrue();
        assertThat(posts.page(null, 2).items()).hasSize(2);
        assertThat(posts.page(null, 2).hasNext()).isFalse();
    }

    @Test void uploadFailureKeepsExistingPostsAndCompensatesStagedImage() {
        var old = oldPost();
        doThrow(new IllegalStateException("storage unavailable")).when(storage).upload(anyString(), any());
        assertThatThrownBy(() -> seed.seed(true)).isInstanceOf(IllegalStateException.class);
        assertThat(seed.exists(old)).isTrue();
        assertThat(jdbc.queryForObject("select count(*) from posts", Integer.class)).isEqualTo(1);
        verify(storage, never()).delete("old-bucket", "old.png");
        verify(storage).delete(eq("seed-test-bucket"), anyString());
    }

    @Test void failedDbReplacementRollsBackOldDataAndRemovesNewUploads() {
        var old = oldPost();
        jdbc.execute("alter table posts add constraint seed_test_reject check (title = '既存投稿')");
        try {
            assertThatThrownBy(() -> seed.seed(true)).isInstanceOf(org.springframework.dao.DataAccessException.class);
            assertThat(seed.exists(old)).isTrue();
            assertThat(jdbc.queryForObject("select count(*) from app_users", Integer.class)).isEqualTo(1);
            verify(storage, never()).delete("old-bucket", "old.png");
            verify(storage, times(4)).delete(eq("seed-test-bucket"), anyString());
        } finally { jdbc.execute("alter table posts drop constraint seed_test_reject"); }
    }

    @Test void disabledImagesStayDisabledAndFailedCleanupCanBeRetried() {
        oldPost(); settings.saveFeatures(false, false);
        doThrow(new IllegalStateException("offline")).when(storage).delete("old-bucket", "old.png");
        assertThat(seed.seed(true)).isEqualTo(new SeedDataService.Result(1, 12, 0, 1));
        verify(storage, never()).upload(anyString(), any());
        assertThat(settings.imagesEnabled()).isFalse();
        doNothing().when(storage).delete("old-bucket", "old.png");
        assertThat(seed.cleanup()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from posts", Integer.class)).isEqualTo(12);
    }

    @Test void cleanupNeverDeletesImagesStillReferencedByAPost() {
        oldPost();
        jdbc.update("insert into image_cleanup values ('old-bucket','old.png')");
        assertThat(seed.cleanup()).isEqualTo(1);
        verifyNoInteractions(storage);
    }

    @Test void missingDemoImagesCanBeAddedWithoutResettingPostsOrChangingText() {
        settings.saveFeatures(false, false);
        seed.seed(false);
        var old = oldPost();
        jdbc.update("update posts set title='変更したタイトル' where id=?", SeedFixtures.id("post:1"));
        settings.saveFeatures(true, false);
        assertThat(seed.fillMissingImages()).isEqualTo(4);
        assertThat(jdbc.queryForObject("select count(*) from posts", Integer.class)).isEqualTo(13);
        assertThat(jdbc.queryForObject("select title from posts where id=?", String.class, SeedFixtures.id("post:1")))
            .isEqualTo("変更したタイトル");
        assertThat(seed.exists(old)).isTrue();
        assertThat(jdbc.queryForObject("select image_key from posts where id=?", String.class, old)).isEqualTo("old.png");
        clearInvocations(storage);
        assertThat(seed.fillMissingImages()).isZero();
        verifyNoInteractions(storage);
    }

    @Test void fillingMissingImagesHonorsOffAndFailedUploadKeepsPosts() {
        settings.saveFeatures(false, false);
        seed.seed(false);
        assertThatThrownBy(seed::fillMissingImages).hasMessageContaining("OFF");
        verify(storage, never()).upload(anyString(), any());
        settings.saveFeatures(true, false);
        doThrow(new IllegalStateException("offline")).when(storage).upload(anyString(), any());
        assertThatThrownBy(seed::fillMissingImages).hasMessage("offline");
        assertThat(jdbc.queryForObject("select count(*) from posts", Integer.class)).isEqualTo(12);
        assertThat(jdbc.queryForObject("select count(*) from posts where image_key is not null", Integer.class)).isZero();
        verify(storage).delete(eq("seed-test-bucket"), anyString());
    }
}
