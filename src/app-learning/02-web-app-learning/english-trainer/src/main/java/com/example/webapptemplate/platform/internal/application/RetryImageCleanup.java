package com.example.webapptemplate.platform.internal.application;

import com.example.webapptemplate.platform.ImageCleanup;
import com.example.webapptemplate.platform.ImageReferences;
import com.example.webapptemplate.platform.ImageStore;
import java.util.List;
public class RetryImageCleanup implements ImageCleanup {
    private final CleanupQueue queue;
    private final ImageStore storage;
    private final List<ImageReferences> references;
    public RetryImageCleanup(CleanupQueue queue, ImageStore storage, List<ImageReferences> references) {
        this.queue = queue; this.storage = storage; this.references = List.copyOf(references);
    }
    public void enqueue(String bucket, String key) { queue.enqueue(bucket, key); }
    public int pending() { return queue.pending(); }
    public int run() {
        for (var image : queue.entries()) {
            if (references.stream().anyMatch(ref -> ref.uses(image.bucket(), image.key()))) continue;
            try { storage.delete(image.bucket(), image.key()); queue.remove(image); }
            catch (IllegalStateException unavailable) { /* Retry later; preserve metadata. */ }
        }
        return pending();
    }
}
