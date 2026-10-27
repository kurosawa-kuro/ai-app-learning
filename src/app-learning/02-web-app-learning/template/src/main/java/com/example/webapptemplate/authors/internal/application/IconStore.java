package com.example.webapptemplate.authors.internal.application;

import java.util.Set;
import java.util.UUID;
import java.util.Optional;
import com.example.webapptemplate.authors.UserIcons.Icon;

public interface IconStore {
    Optional<Icon> icon(UUID id);
    Set<UUID> usersWithIcons();
    void save(UUID id, Icon icon);
    void delete(UUID id);
}
