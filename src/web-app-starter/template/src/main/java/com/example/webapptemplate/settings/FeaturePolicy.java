package com.example.webapptemplate.settings;

public interface FeaturePolicy {
    boolean imagesEnabled();
    boolean aiEnabled();
    default void requireImagesEnabled() {
        if (!imagesEnabled()) throw new IllegalArgumentException("画像投稿はOFFです。画像なしで投稿してください。");
    }
    default void requireAiEnabled() {
        if (!aiEnabled()) throw new IllegalStateException("AI連携は禁止されています。管理画面で許可してください。");
    }
}
