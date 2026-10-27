package com.example.webapptemplate.settings.internal;

import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.settings.SettingsOperations;
import com.example.webapptemplate.settings.internal.application.SettingsService;
import com.example.webapptemplate.settings.internal.application.SettingsStore;
import org.springframework.context.annotation.*;
@Configuration
class SettingsConfiguration {
    @Bean SettingsOperations settingsOperations(SettingsStore store, ImageStore storage) { return new SettingsService(store,storage); }
}
