package com.example.webapptemplate.settings.internal.application;

public interface SettingsStore {
    boolean imagesEnabled();
    boolean aiEnabled();
    void saveFeatures(boolean imagesEnabled, boolean aiEnabled);
    String allowedAiModels();
    void saveAllowedAiModels(String models);
}
