package com.example.webapptemplate.settings.internal.adapter.persistence;
import com.example.webapptemplate.settings.internal.application.SettingsStore;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

/** App-wide preferences, shared across requests and instances using the same schema. */
@Repository
@DependsOnDatabaseInitialization
public class JdbcSettingsStore implements SettingsStore {
    private final JdbcTemplate jdbc;

    public JdbcSettingsStore(JdbcTemplate jdbc, @Value("${app.images.enabled}") boolean initialImagesEnabled) {
        this.jdbc = jdbc;
        // Environment variables seed new installations; never overwrite a saved preference.
        jdbc.update("insert into app_settings (id, images_enabled) values (1, ?) on conflict (id) do nothing",
                initialImagesEnabled);
    }

    public boolean imagesEnabled() {
        return Boolean.TRUE.equals(jdbc.queryForObject("select images_enabled from app_settings where id = 1", Boolean.class));
    }

    public boolean aiEnabled() {
        return Boolean.TRUE.equals(jdbc.queryForObject("select ai_enabled from app_settings where id = 1", Boolean.class));
    }

    public void saveFeatures(boolean imagesEnabled, boolean aiEnabled) {
        jdbc.update("update app_settings set images_enabled = ?, ai_enabled = ?, updated_at = now() where id = 1",
                imagesEnabled, aiEnabled);
    }
    public String allowedAiModels() {
        return jdbc.queryForObject("select allowed_ai_models from app_settings where id = 1",String.class);
    }
    public void saveAllowedAiModels(String models) {
        jdbc.update("update app_settings set allowed_ai_models = ?, updated_at = now() where id = 1",models);
    }
}
