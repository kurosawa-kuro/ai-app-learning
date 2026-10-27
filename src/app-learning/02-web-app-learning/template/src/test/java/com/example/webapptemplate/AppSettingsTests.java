package com.example.webapptemplate;

import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.internal.adapter.storage.SupabaseImageStore;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.settings.SettingsOperations;
import com.example.webapptemplate.settings.internal.application.SettingsService;
import com.example.webapptemplate.settings.internal.adapter.persistence.JdbcSettingsStore;
import com.example.webapptemplate.settings.internal.adapter.web.SettingsController;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.web.servlet.mvc.support.RedirectAttributesModelMap;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@Transactional
class AppSettingsTests {
    @Autowired JdbcSettingsStore settings;
    @Autowired SettingsOperations policy;
    @Autowired JdbcTemplate jdbc;
    @Autowired AuthorOperations repository;

    @Test
    void persistedSettingsSurviveReconstructionAndIgnoreStartupDefault() {
        var user = repository.addAuthor("設定検証");
        repository.saveDefaultUser(user);
        settings.saveFeatures(true, true);
        var reloaded = new JdbcSettingsStore(jdbc, false);
        assertThat(reloaded.imagesEnabled()).isTrue();
        assertThat(reloaded.aiEnabled()).isTrue();
        assertThat(repository.defaultUserId()).isEqualTo(user);
        settings.saveFeatures(false, false);
        assertThat(reloaded.imagesEnabled()).isFalse();
        assertThatThrownBy(policy::requireAiEnabled).hasMessageContaining("禁止");
    }

    @Test
    void defaultUserIsFallbackAndDeletionClearsIt() {
        var fallback = repository.addAuthor("既定");
        var chosen = repository.addAuthor("選択");
        repository.saveDefaultUser(fallback);
        assertThat(repository.selected(null).id()).isEqualTo(fallback);
        assertThat(repository.selected("invalid").id()).isEqualTo(fallback);
        assertThat(repository.selected(UUID.randomUUID().toString()).id()).isEqualTo(fallback);
        assertThat(repository.selected(chosen.toString()).id()).isEqualTo(chosen);
        repository.deleteAuthor(fallback);
        assertThat(repository.defaultUserId()).isNull();
        assertThat(repository.selected(null)).isNull();
    }

    @Test
    void failedStorageValidationDoesNotPartiallySaveFeatures() {
        settings.saveFeatures(false, false);
        var storage = mock(ImageStore.class);
        doThrow(new IllegalStateException("接続できません")).when(storage).ensureBucket();
        var model = new ExtendedModelMap();
        var controller = new SettingsController(new SettingsService(settings, storage), storage);
        assertThat(controller.save(true, true, model, new RedirectAttributesModelMap())).isEqualTo("settings/index");
        assertThat(model.get("imagePosting")).isEqualTo(true);
        assertThat(model.get("aiIntegration")).isEqualTo(true);
        assertThat(model.get("error")).isEqualTo("接続できません");
        assertThat(settings.imagesEnabled()).isFalse();
        assertThat(settings.aiEnabled()).isFalse();
    }

    @Test
    void missingCredentialsCannotEnableImagesAndOffNeverContactsStorage() {
        var storage = new SupabaseImageStore("", "", "unused");
        assertThat(storage.configured()).isFalse();
        assertThatThrownBy(storage::ensureBucket).hasMessageContaining("未設定");
        var mockedStorage = mock(ImageStore.class);
        var controller = new SettingsController(new SettingsService(settings, mockedStorage), mockedStorage);
        assertThat(controller.save(false, true, new ExtendedModelMap(), new RedirectAttributesModelMap()))
                .isEqualTo("redirect:/admin/settings");
        verifyNoInteractions(mockedStorage);
        assertThat(settings.aiEnabled()).isTrue();
        assertThatCode(policy::requireAiEnabled).doesNotThrowAnyException();
    }
}
