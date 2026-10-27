package com.example.webapptemplate;

import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** App-wide preferences, shared across requests and instances using the same schema. */
@Repository
@DependsOnDatabaseInitialization
class AppSettings {
    private final JdbcTemplate jdbc;

    AppSettings(JdbcTemplate jdbc, @Value("${app.images.enabled}") boolean initialImagesEnabled) {
        this.jdbc = jdbc;
        // Environment variables seed new installations; never overwrite a saved preference.
        jdbc.update("insert into app_settings (id, images_enabled) values (1, ?) on conflict (id) do nothing",
                initialImagesEnabled);
    }

    boolean imagesEnabled() {
        return Boolean.TRUE.equals(jdbc.queryForObject("select images_enabled from app_settings where id = 1", Boolean.class));
    }

    boolean aiEnabled() {
        return Boolean.TRUE.equals(jdbc.queryForObject("select ai_enabled from app_settings where id = 1", Boolean.class));
    }

    void requireAiEnabled() {
        if (!aiEnabled()) throw new IllegalStateException("AI連携は禁止されています。管理画面で許可してください。");
    }

    UUID defaultUserId() {
        return jdbc.queryForObject("select default_user_id from app_settings where id = 1", UUID.class);
    }

    void saveDefaultUser(UUID id) {
        jdbc.update("update app_settings set default_user_id = ?, updated_at = now() where id = 1", id);
    }

    void saveFeatures(boolean imagesEnabled, boolean aiEnabled) {
        jdbc.update("update app_settings set images_enabled = ?, ai_enabled = ?, updated_at = now() where id = 1",
                imagesEnabled, aiEnabled);
    }
}
