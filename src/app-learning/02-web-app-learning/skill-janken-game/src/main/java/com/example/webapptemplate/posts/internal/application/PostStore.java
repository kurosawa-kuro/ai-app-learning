package com.example.webapptemplate.posts.internal.application;

import java.util.List;
import java.util.UUID;
import com.example.webapptemplate.posts.PostView;

public interface PostStore {
    record Receipt(UUID postId, String fingerprint) {}
    void lockRequest(UUID id);
    java.util.Optional<Receipt> request(UUID id);
    void saveRequest(UUID id, String fingerprint, UUID postId);
    long searchCount(UUID userId, String query);
    List<PostView> search(UUID userId, String query, String sort, int limit, long offset);
    boolean update(PostView post, long expectedVersion);
    long count(UUID userId);
    List<PostView> page(UUID userId, int limit, long offset);
    List<PostView> posts(UUID userId);
    PostView post(UUID id);
    void insert(PostView post);
    void deletePost(UUID id);
}
