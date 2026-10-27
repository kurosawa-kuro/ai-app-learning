package com.example.webapptemplate.authors;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AuthorOperations {
    List<AuthorView> authors();
    List<AuthorView> choices();
    Optional<AuthorView> author(UUID id);
    void rename(UUID id, String name);
    UUID addAuthor(String name);
    void requireAuthor(UUID id);
    int deleteAuthor(UUID id);
    UUID defaultUserId();
    void saveDefaultUser(UUID id);
    AuthorView selected(String cookie);
}
