package com.example.webapptemplate.authors.internal.application;

import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.authors.AuthorView;
import com.example.webapptemplate.authors.internal.domain.AuthorDeletion;
import com.example.webapptemplate.authors.internal.domain.AuthorName;
import com.example.webapptemplate.platform.ImageCleanup;
import com.example.webapptemplate.platform.UnitOfWork;
import java.util.*;
public class AuthorService implements AuthorOperations {
    private final AuthorStore store;
    private final IconStore icons;
    private final UnitOfWork transaction;
    private final ImageCleanup cleanup;

    public AuthorService(AuthorStore store, IconStore icons, UnitOfWork transaction, ImageCleanup cleanup) {
        this.store=store; this.icons=icons; this.transaction=transaction; this.cleanup=cleanup;

    }
    public List<AuthorView> choices() { return store.choices(); }
    public List<AuthorView> authors() { return store.authors(); }
    public Optional<AuthorView> author(UUID id) { return store.author(id); }
    public void rename(UUID id,String name) {
        requireAuthor(id); store.rename(id,new AuthorName(name).value());
    }
    public UUID addAuthor(String name) { return store.addAuthor(new AuthorName(name).value()); }
    public void requireAuthor(UUID id) {
        if (id == null || author(id).isEmpty()) throw new IllegalArgumentException("投稿者を選択してください。");
    }
    public int deleteAuthor(UUID id) {
        transaction.run(() -> {
            store.lockUser(id);
            AuthorDeletion.requireUnused(store.author(id).orElseThrow().usageCount());
            icons.icon(id).ifPresent(old -> cleanup.enqueue(old.bucket(),old.key()));
            store.deleteAuthor(id); // FK remains the final concurrent-write guard.
        });
        return cleanup.run();
    }
    public UUID defaultUserId() { return store.defaultUserId(); }
    public void saveDefaultUser(UUID id) { if (id != null) requireAuthor(id); store.saveDefaultUser(id); }
    public AuthorView selected(String cookie) {
        try {
            if (cookie != null) {
                var selected=author(UUID.fromString(cookie));
                if (selected.isPresent()) return selected.get();
            }
        } catch (IllegalArgumentException malformed) { /* Fall back to the application default. */ }
        var fallback=defaultUserId();
        return fallback == null ? null : author(fallback).orElse(null);
    }
}
