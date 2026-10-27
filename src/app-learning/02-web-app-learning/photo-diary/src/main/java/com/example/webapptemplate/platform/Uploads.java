package com.example.webapptemplate.platform;

import java.io.IOException;
import org.springframework.web.multipart.MultipartFile;
public final class Uploads {
    public static ImageUpload from(MultipartFile file) {
        if (file == null || file.isEmpty()) return null;
        if (file.getSize() > ImageUpload.MAX_BYTES) throw new IllegalArgumentException("画像は5MB以下にしてください。");
        try { return new ImageUpload(file.getBytes()); }
        catch (IOException failure) { throw new IllegalArgumentException("画像を読み取れませんでした。別の画像で試してください。"); }
    }
    private Uploads() {}
}
