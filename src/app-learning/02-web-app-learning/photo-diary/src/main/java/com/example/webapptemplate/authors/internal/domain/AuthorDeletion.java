package com.example.webapptemplate.authors.internal.domain;

public final class AuthorDeletion {
    public static void requireUnused(long usageCount) {
        if (usageCount > 0) throw new IllegalArgumentException("利用中のユーザーは削除できません。関連データを先に整理してください。");
    }
    private AuthorDeletion() {}
}
