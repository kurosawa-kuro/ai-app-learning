package com.example.webapptemplate.platform;

/** 各機能の永続化Adapterが提供する参照検査SPI。共通基盤は業務テーブルを知らない。 */
public interface ImageReferences { boolean uses(String bucket, String key);
    default java.util.List<StoredImage> images() { return java.util.List.of(); } }
