package com.example.webapptemplate.settings.internal.application;

import com.example.webapptemplate.settings.SettingsOperations;
import com.example.webapptemplate.platform.ImageStore;
public class SettingsService implements SettingsOperations {
    private final SettingsStore store;
    private final ImageStore storage;
    public SettingsService(SettingsStore store, ImageStore storage) { this.store=store; this.storage=storage; }
    public boolean imagesEnabled() { return store.imagesEnabled(); }
    public boolean aiEnabled() { return store.aiEnabled(); }
    public void saveFeatures(boolean images, boolean ai) {
        if (images) storage.ensureBucket();
        store.saveFeatures(images,ai);
    }
}
