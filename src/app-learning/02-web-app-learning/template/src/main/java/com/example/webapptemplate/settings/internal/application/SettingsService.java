package com.example.webapptemplate.settings.internal.application;

import com.example.webapptemplate.settings.SettingsOperations;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.AuditTrail;
public class SettingsService implements SettingsOperations {
    private final SettingsStore store;
    private final ImageStore storage;
    private final AuditTrail audit;
    public SettingsService(SettingsStore store, ImageStore storage) { this(store,storage,AuditTrail.NONE); }
    public SettingsService(SettingsStore store, ImageStore storage,AuditTrail audit) { this.store=store; this.storage=storage; this.audit=audit; }
    public boolean imagesEnabled() { return store.imagesEnabled(); }
    public boolean aiEnabled() { return store.aiEnabled(); }
    public void saveFeatures(boolean images, boolean ai) {
        try {
            if (images) storage.ensureBucket();
            store.saveFeatures(images,ai); audit.record("settings.save","success",null);
        } catch(RuntimeException failure) { audit.record("settings.save","failure",null); throw failure; }
    }
}
