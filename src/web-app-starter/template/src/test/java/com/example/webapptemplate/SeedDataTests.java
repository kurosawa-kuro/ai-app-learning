package com.example.webapptemplate;

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
    "spring.datasource.hikari.schema=app_template_seed_test",
    "spring.flyway.schemas=app_template_seed_test",
    "spring.flyway.default-schema=app_template_seed_test"
})
class SeedDataTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired TransactionTemplate transaction;
    @Autowired AppSettings settings;
    ImageStorage storage;
    SeedDataService seed;

    @BeforeEach void setup() {
        assertThat(jdbc.queryForObject("select current_schema()", String.class)).isEqualTo("app_template_seed_test");
        jdbc.execute("alter table posts drop constraint if exists seed_test_reject");
        jdbc.update("delete from posts");
        jdbc.update("delete from image_cleanup");
        jdbc.update("delete from app_users");
        settings.saveFeatures(true, true);
        storage = mock(ImageStorage.class);
        when(storage.bucket()).thenReturn("seed-test-bucket");
        seed = new SeedDataService(jdbc, transaction, storage, settings);
    }

    UUID oldPost() {
        var user = UUID.randomUUID(); var post = UUID.randomUUID();
        jdbc.update("insert into app_users(id,name) values (?, '既存ユーザー')", user);
        settings.saveDefaultUser(user);
        jdbc.update("insert into posts(id,user_id,title,image_bucket,image_key,image_type) values (?,?, '既存投稿','old-bucket','old.png','image/png')", post, user);
        return post;
    }

    @Test void resetReplacesOnlyPostsAndAddIsIdempotent() {
        var old = oldPost(); var defaultUser = settings.defaultUserId();
        var result = seed.seed(true);
        assertThat(result).isEqualTo(new SeedDataService.Result(1, 8, 2, 0));
        assertThat(seed.exists(old)).isFalse();
        assertThat(settings.defaultUserId()).isEqualTo(defaultUser);
        assertThat(settings.aiEnabled()).isTrue();
        assertThat(settings.imagesEnabled()).isTrue();
        assertThat(jdbc.queryForObject("select count(*) from app_users", Integer.class)).isEqualTo(4);
        verify(storage).delete("old-bucket", "old.png");
        clearInvocations(storage);
        assertThat(seed.seed(false)).isEqualTo(new SeedDataService.Result(0, 0, 0, 0));
        verifyNoInteractions(storage);
        assertThat(jdbc.queryForObject("select count(*) from posts", Integer.class)).isEqualTo(8);
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
            verify(storage, times(2)).delete(eq("seed-test-bucket"), anyString());
        } finally { jdbc.execute("alter table posts drop constraint seed_test_reject"); }
    }

    @Test void disabledImagesStayDisabledAndFailedCleanupCanBeRetried() {
        oldPost(); settings.saveFeatures(false, false);
        doThrow(new IllegalStateException("offline")).when(storage).delete("old-bucket", "old.png");
        assertThat(seed.seed(true)).isEqualTo(new SeedDataService.Result(1, 8, 0, 1));
        verify(storage, never()).upload(anyString(), any());
        assertThat(settings.imagesEnabled()).isFalse();
        doNothing().when(storage).delete("old-bucket", "old.png");
        assertThat(seed.cleanup()).isZero();
        assertThat(jdbc.queryForObject("select count(*) from posts", Integer.class)).isEqualTo(8);
    }

    @Test void cleanupNeverDeletesImagesStillReferencedByAPost() {
        oldPost();
        jdbc.update("insert into image_cleanup values ('old-bucket','old.png')");
        assertThat(seed.cleanup()).isEqualTo(1);
        verifyNoInteractions(storage);
    }
}
