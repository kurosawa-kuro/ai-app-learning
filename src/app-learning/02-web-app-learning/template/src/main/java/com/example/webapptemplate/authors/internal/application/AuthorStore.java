package com.example.webapptemplate.authors.internal.application;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import com.example.webapptemplate.authors.AuthorView;

public interface AuthorStore {
    List<AuthorView> authors();
    List<AuthorView> choices();
    Optional<AuthorView> author(UUID id);
    void rename(UUID id, String name);
    UUID addAuthor(String name);
    void deleteAuthor(UUID id);
    void lockUser(UUID id);
    UUID defaultUserId();
    void saveDefaultUser(UUID id);
}
