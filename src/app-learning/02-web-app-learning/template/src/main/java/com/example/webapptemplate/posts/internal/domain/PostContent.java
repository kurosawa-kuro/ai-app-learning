package com.example.webapptemplate.posts.internal.domain;

import java.util.LinkedHashMap;
import java.util.Map;

/** 投稿内容の不変条件。Web・DB・Springなしで検査できる。 */
public record PostContent(String title, String body) {
    public static final int TITLE_LIMIT = 120;
    public static final int BODY_LIMIT = 5000;
    public PostContent {
        var errors = errors(title, body);
        if (!errors.isEmpty()) throw new IllegalArgumentException(String.join(" ", errors.values()));
        title = title.strip(); body = body.strip();
    }
    public static Map<String, String> errors(String title, String body) {
        var errors = new LinkedHashMap<String, String>();
        if (title == null || title.isBlank() || title.strip().length() > TITLE_LIMIT)
            errors.put("title", "タイトルは1〜120文字で入力してください。");
        if (body == null || body.strip().length() > BODY_LIMIT)
            errors.put("body", "本文は5000文字以内で入力してください。");
        return errors;
    }
}
