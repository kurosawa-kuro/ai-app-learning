package com.example.webapptemplate.authors.internal.domain;

public record AuthorName(String value) {
    public AuthorName {
        if (value == null || value.isBlank() || value.strip().length() > 80)
            throw new IllegalArgumentException("投稿者名は1〜80文字で入力してください。");
        value = value.strip();
    }
}
