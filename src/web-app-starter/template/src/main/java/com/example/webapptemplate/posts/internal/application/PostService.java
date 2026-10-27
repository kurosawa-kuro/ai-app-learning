package com.example.webapptemplate.posts.internal.application;
import com.example.webapptemplate.platform.ImageCodec;
import com.example.webapptemplate.platform.ImageData;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.ImageUpload;
import com.example.webapptemplate.platform.UnitOfWork;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.posts.PostOperations;
import com.example.webapptemplate.posts.PostPage;
import com.example.webapptemplate.posts.PostView;
import com.example.webapptemplate.settings.FeaturePolicy;
import com.example.webapptemplate.posts.internal.domain.PostContent;

import java.util.UUID;

public class PostService implements PostOperations {
    private static final int PAGE_SIZE = 10;
    private final AuthorOperations authors;
    private final FeaturePolicy policy;
    private final PostStore repository;
    private final ImageStore storage;
    private final ImageCodec validator;
    private final UnitOfWork transactions;
    public PostService(PostStore repository, ImageStore storage, ImageCodec validator, UnitOfWork transactions, AuthorOperations authors, FeaturePolicy policy) {
        this.authors=authors; this.policy=policy;
        this.repository = repository; this.storage = storage; this.validator = validator; this.transactions = transactions;
    }
    public UUID create(UUID author, String title, String body, ImageUpload file) {
        authors.requireAuthor(author);
        var content = new PostContent(title, body);
        title=content.title(); body=content.body();
        var id = UUID.randomUUID();
        ImageData image = null;
        String key = null;
        if (file != null) {
            policy.requireImagesEnabled();
            image = validator.read(file);
            key = id + "." + image.extension();
            try { storage.upload(key, image); }
            catch (RuntimeException failure) {
                // A timed-out upload might have completed remotely; remove only this request's key.
                cleanupAfterFailure(key, failure);
                throw failure;
            }
        }
        var post = new PostView(id, author, "", title, body,
                key == null ? null : storage.bucket(), key, image == null ? null : image.type(), null);
        try { transactions.run(() -> repository.insert(post)); }
        catch (RuntimeException failure) {
            if (key != null) {
                cleanupAfterFailure(key, failure);
            }
            throw failure;
        }
        return id;
    }
    private void cleanupAfterFailure(String key, RuntimeException failure) {
        try { storage.delete(storage.bucket(), key); }
        catch (RuntimeException cleanup) {
            System.getLogger(PostService.class.getName()).log(System.Logger.Level.WARNING,
                "Image cleanup pending: bucket={0}, object={1}", storage.bucket(), key);
            failure.addSuppressed(cleanup);
        }
    }
    public void delete(UUID id) {
        var post = repository.post(id);
        // Keep the DB record if Storage is unavailable, so deletion can be retried.
        if (post.imageKey() != null) storage.delete(post.imageBucket(), post.imageKey());
        repository.deletePost(id);
    }
    public java.util.List<PostView> posts(UUID userId) { return repository.posts(userId); }
    public PostPage page(UUID userId, long requestedPage) {
        long total = repository.count(userId);
        long last = Math.max(1, total / PAGE_SIZE + (total % PAGE_SIZE == 0 ? 0 : 1));
        long number = Math.max(1, Math.min(requestedPage, last));
        var items = repository.page(userId, PAGE_SIZE, (number - 1) * PAGE_SIZE);
        return new PostPage(items, number, PAGE_SIZE, total);
    }
    public PostView post(UUID id) { return repository.post(id); }
}
