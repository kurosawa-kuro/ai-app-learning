package com.example.webapptemplate.authors.internal.domain;

public final class AuthorDeletion {
    public static void requireNoPosts(long postCount) {
        if (postCount > 0) throw new IllegalArgumentException("投稿があるユーザーは削除できません。先に投稿を削除してください。");
    }
    private AuthorDeletion() {}
}
