package com.example.webapptemplate.platform;

public record ImageUpload(byte[] bytes) {
    public static final int MAX_BYTES = 5 * 1024 * 1024;
    public ImageUpload {
        if (bytes == null || bytes.length == 0) throw new IllegalArgumentException("画像を選択してください。");
        if (bytes.length > MAX_BYTES) throw new IllegalArgumentException("画像は5MB以下にしてください。");
        bytes = bytes.clone();
    }
    @Override public byte[] bytes() { return bytes.clone(); }
}
