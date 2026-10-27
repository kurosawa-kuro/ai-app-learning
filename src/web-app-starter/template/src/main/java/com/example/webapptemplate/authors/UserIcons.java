package com.example.webapptemplate.authors;

import java.util.UUID;
import java.util.Set;
import java.util.Optional;
import com.example.webapptemplate.platform.ImageUpload;

public interface UserIcons {
    record Icon(String bucket, String key, String type) {}
    Optional<Icon> icon(UUID id);
    Set<UUID> usersWithIcons();
    String url(UUID id);
    int save(UUID id, ImageUpload file);
    int remove(UUID id);
}
