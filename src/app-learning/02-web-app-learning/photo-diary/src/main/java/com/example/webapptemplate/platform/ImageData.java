package com.example.webapptemplate.platform;

/** 検証・再エンコード済み画像。HTTPやStorageの型を境界へ持ち込まない。 */
public record ImageData(byte[] bytes, String type, String extension) {}
