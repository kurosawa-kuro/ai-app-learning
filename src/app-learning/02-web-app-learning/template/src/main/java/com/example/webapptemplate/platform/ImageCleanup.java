package com.example.webapptemplate.platform;

public interface ImageCleanup {
    void enqueue(String bucket, String key);
    int pending();
    int run();
}
