package com.example.webapptemplate.platform;

public interface ImageCodec {
    ImageData read(ImageUpload input);
    ImageData square(ImageData image);
}
