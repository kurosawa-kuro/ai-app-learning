package com.example.webapptemplate.platform;
/** Protect images still referenced by a feature during failed-upload cleanup. */
public interface ImageReferences { boolean uses(String bucket, String key); }
