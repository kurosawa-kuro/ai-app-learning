package com.example.webapptemplate.authors.internal.application;

import com.example.webapptemplate.platform.ImageCleanup;
import com.example.webapptemplate.platform.ImageCodec;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.ImageUpload;
import com.example.webapptemplate.platform.UnitOfWork;
import com.example.webapptemplate.authors.UserIcons;
import java.util.*;
public class UserIconService implements UserIcons {
    private final AuthorStore authors;
    private final IconStore icons;
    private final UnitOfWork transaction;
    private final ImageStore storage;
    private final ImageCodec validator;
    private final ImageCleanup cleanup;
    public UserIconService(AuthorStore authors, IconStore icons, UnitOfWork transaction, ImageStore storage, ImageCodec validator, ImageCleanup cleanup) {
        this.authors=authors; this.icons=icons; this.transaction=transaction; this.storage=storage; this.validator=validator; this.cleanup=cleanup;
    }
    public Optional<Icon> icon(UUID id) { return icons.icon(id); }
    public Set<UUID> usersWithIcons() { return icons.usersWithIcons(); }
    public String url(UUID id) { return storage.configured() && icon(id).isPresent() ? "/admin/users/" + id + "/icon" : null; }
    public int save(UUID id, ImageUpload file) {
        if (authors.author(id).isEmpty()) throw new IllegalArgumentException("投稿者を選択してください。");
        if (file == null) throw new IllegalArgumentException("アイコンにする画像を選択してください。");
        var image = validator.square(validator.read(file));
        String key = UUID.randomUUID() + ".png";
        boolean committed = false;
        try {
            storage.upload(key, image);
            transaction.run(() -> {
                authors.lockUser(id);
                icon(id).ifPresent(old -> cleanup.enqueue(old.bucket(), old.key()));
                icons.save(id, new Icon(storage.bucket(), key, image.type()));
            });
            committed = true;
        } finally {
            if (!committed) {
                cleanup.enqueue(storage.bucket(), key);
                cleanup.run();
            }
        }
        return cleanup.run();
    }
    public int remove(UUID id) {
        transaction.run(() -> {
            authors.lockUser(id);
            icon(id).ifPresent(old -> cleanup.enqueue(old.bucket(), old.key()));
            icons.delete(id);
        });
        return cleanup.run();
    }
}
