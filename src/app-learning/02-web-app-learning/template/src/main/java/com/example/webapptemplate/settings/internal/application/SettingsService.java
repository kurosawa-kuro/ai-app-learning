package com.example.webapptemplate.settings.internal.application;

import com.example.webapptemplate.settings.SettingsOperations;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.settings.internal.domain.AllowedAiModels;
public class SettingsService implements SettingsOperations {
    private final SettingsStore store;
    private final ImageStore storage;

    public SettingsService(SettingsStore store, ImageStore storage) { this.store=store; this.storage=storage;  }
    public boolean imagesEnabled() { return store.imagesEnabled(); }
    public boolean aiEnabled() { return store.aiEnabled(); }
    public java.util.List<String> allowedAiModels() { return AllowedAiModels.parse(store.allowedAiModels()).values(); }
    public boolean allowsAiModel(String model) { return model!=null && allowedAiModels().contains(model); }
    public void saveAllowedAiModels(String input) {
        store.saveAllowedAiModels(AllowedAiModels.parse(input).stored());
    }
    public void saveFeatures(boolean images, boolean ai) {
        if (images) storage.ensureBucket();
        store.saveFeatures(images,ai);
    }
}
