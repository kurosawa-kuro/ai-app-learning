package com.example.webapptemplate.posts.internal.application;

import java.util.List;
import java.util.UUID;
import com.example.webapptemplate.posts.PostView;

public interface PostStore {
    long count(UUID userId);
    List<PostView> page(UUID userId, int limit, long offset);
    List<PostView> posts(UUID userId);
    PostView post(UUID id);
    void insert(PostView post);
    void deletePost(UUID id);
}
