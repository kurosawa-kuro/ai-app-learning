package com.example.webapptemplate.platform;

public interface ImageStore {
    void check();
    boolean configured();
    String bucket();
    void ensureBucket();
    void upload(String key, ImageData image);
    byte[] download(String bucket, String key);
    void delete(String bucket, String key);
}
