package com.example.webapptemplate.settings;

public interface SettingsOperations extends FeaturePolicy {
    void saveFeatures(boolean imagesEnabled, boolean aiEnabled);
    java.util.List<String> allowedAiModels();
    void saveAllowedAiModels(String models);
}
