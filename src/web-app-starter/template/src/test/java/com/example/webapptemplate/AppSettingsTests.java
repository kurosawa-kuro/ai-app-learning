package com.example.webapptemplate;

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
    @Autowired AppSettings settings;
    @Autowired JdbcTemplate jdbc;
    @Autowired PostRepository repository;

    @Test
    void persistedSettingsSurviveReconstructionAndIgnoreStartupDefault() {
        var user = repository.addAuthor("設定検証");
        settings.saveDefaultUser(user);
        settings.saveFeatures(true, true);
        var reloaded = new AppSettings(jdbc, false);
        assertThat(reloaded.imagesEnabled()).isTrue();
        assertThat(reloaded.aiEnabled()).isTrue();
        assertThat(reloaded.defaultUserId()).isEqualTo(user);
        settings.saveFeatures(false, false);
        assertThat(reloaded.imagesEnabled()).isFalse();
        assertThatThrownBy(reloaded::requireAiEnabled).hasMessageContaining("禁止");
    }

    @Test
    void defaultUserIsFallbackAndDeletionClearsIt() {
        var fallback = repository.addAuthor("既定");
        var chosen = repository.addAuthor("選択");
        settings.saveDefaultUser(fallback);
        var context = new PageContext(repository, mock(ImageStorage.class), settings, mock(UserIconService.class));
        assertThat(context.currentAuthor(null).id()).isEqualTo(fallback);
        assertThat(context.currentAuthor("invalid").id()).isEqualTo(fallback);
        assertThat(context.currentAuthor(UUID.randomUUID().toString()).id()).isEqualTo(fallback);
        assertThat(context.currentAuthor(chosen.toString()).id()).isEqualTo(chosen);
        repository.deleteAuthor(fallback);
        assertThat(settings.defaultUserId()).isNull();
        assertThat(context.currentAuthor(null)).isNull();
    }

    @Test
    void failedStorageValidationDoesNotPartiallySaveFeatures() {
        settings.saveFeatures(false, false);
        var storage = mock(ImageStorage.class);
        doThrow(new IllegalStateException("接続できません")).when(storage).ensureBucket();
        var model = new ExtendedModelMap();
        var controller = new SettingsController(settings, storage);
        assertThat(controller.save(true, true, model, new RedirectAttributesModelMap())).isEqualTo("settings/index");
        assertThat(model.get("imagePosting")).isEqualTo(true);
        assertThat(model.get("aiIntegration")).isEqualTo(true);
        assertThat(model.get("error")).isEqualTo("接続できません");
        assertThat(settings.imagesEnabled()).isFalse();
        assertThat(settings.aiEnabled()).isFalse();
    }

    @Test
    void missingCredentialsCannotEnableImagesAndOffNeverContactsStorage() {
        var storage = new ImageStorage(settings, "", "", "unused");
        assertThat(storage.configured()).isFalse();
        assertThatThrownBy(storage::ensureBucket).hasMessageContaining("未設定");
        var mockedStorage = mock(ImageStorage.class);
        var controller = new SettingsController(settings, mockedStorage);
        assertThat(controller.save(false, true, new ExtendedModelMap(), new RedirectAttributesModelMap()))
                .isEqualTo("redirect:/admin/settings");
        verifyNoInteractions(mockedStorage);
        assertThat(settings.aiEnabled()).isTrue();
        assertThatCode(settings::requireAiEnabled).doesNotThrowAnyException();
    }
}
