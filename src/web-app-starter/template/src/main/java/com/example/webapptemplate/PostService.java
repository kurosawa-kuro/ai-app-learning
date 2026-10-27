package com.example.webapptemplate;

import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
class PostService {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(PostService.class);
    private final PostRepository repository;
    private final ImageStorage storage;
    private final ImageValidator validator;
    private final TransactionTemplate transactions;
    PostService(PostRepository repository, ImageStorage storage, ImageValidator validator, TransactionTemplate transactions) {
        this.repository = repository; this.storage = storage; this.validator = validator; this.transactions = transactions;
    }
    UUID create(UUID author, String title, String body, MultipartFile file) {
        repository.requireAuthor(author);
        title = title.strip(); body = body.strip();
        if (title.isEmpty() || title.length() > 120 || body.length() > 5000)
            throw new IllegalArgumentException("タイトルは1〜120文字、本文は5000文字以内で入力してください。");
        var id = UUID.randomUUID();
        ImageValidator.Image image = null;
        String key = null;
        if (file != null && !file.isEmpty()) {
            storage.requireEnabled();
            image = validator.read(file);
            key = id + "." + image.extension();
            try { storage.upload(key, image); }
            catch (RuntimeException failure) {
                // A timed-out upload might have completed remotely; remove only this request's key.
                cleanupAfterFailure(key, failure);
                throw failure;
            }
        }
        var post = new PostRepository.Post(id, author, "", title, body,
                key == null ? null : storage.bucket(), key, image == null ? null : image.type(), null);
        try { transactions.executeWithoutResult(status -> repository.insert(post)); }
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
            log.warn("Image cleanup pending: bucket={}, object={}", storage.bucket(), key);
            failure.addSuppressed(cleanup);
        }
    }
    void delete(UUID id) {
        var post = repository.post(id);
        // Keep the DB record if Storage is unavailable, so deletion can be retried.
        if (post.imageKey() != null) storage.delete(post.imageBucket(), post.imageKey());
        repository.deletePost(id);
    }
}
