package com.example.webapptemplate.platform.internal.application;

import java.util.List;
public interface CleanupQueue {
    record ObjectRef(String bucket, String key) {}
    void enqueue(String bucket, String key);
    int pending();
    List<ObjectRef> entries();
    void remove(ObjectRef image);
}
