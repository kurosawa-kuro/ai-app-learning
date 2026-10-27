package com.example.webapptemplate.posts;

import java.util.List;
import java.util.UUID;
import com.example.webapptemplate.platform.ImageUpload;

public interface PostOperations {
    PostPage page(UUID author, long page);
    /** Full collection for explicit CSV export; screens use page(). */
    List<PostView> posts(UUID author);
    PostView post(UUID id);
    UUID create(UUID author, String title, String body, ImageUpload image);
    void delete(UUID id);
}
