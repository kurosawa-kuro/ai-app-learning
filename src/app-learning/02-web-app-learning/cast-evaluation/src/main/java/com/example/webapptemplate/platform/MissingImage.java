package com.example.webapptemplate.platform;
public class MissingImage extends IllegalStateException {
    public MissingImage() { super("保存された画像が見つかりません。画像を再アップロードしてください。"); }
}
