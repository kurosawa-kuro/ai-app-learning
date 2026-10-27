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
import com.example.webapptemplate.platform.ImageCleanup;

public class PostService implements PostOperations {
    private static final int PAGE_SIZE = 10;
    private final ImageCleanup cleanup;

    private final AuthorOperations authors;
    private final FeaturePolicy policy;
    private final PostStore repository;
    private final ImageStore storage;
    private final ImageCodec validator;
    private final UnitOfWork transactions;
    public PostService(PostStore repository, ImageStore storage, ImageCodec validator, UnitOfWork transactions, AuthorOperations authors, FeaturePolicy policy, ImageCleanup cleanup) {
        this.cleanup=cleanup;
        this.authors=authors; this.policy=policy;
        this.repository = repository; this.storage = storage; this.validator = validator; this.transactions = transactions;
    }
    public UUID create(UUID author, String title, String body, ImageUpload file) {
        var post=prepare(UUID.randomUUID(),author,title,body,file);
        try { transactions.run(() -> repository.insert(post)); }
        catch(RuntimeException failure) {
            if(post.imageKey()!=null) cleanupAfterFailure(post.imageKey(),failure);
            throw failure;
        }
        return post.id();
    }
    /** Validate and upload before opening a database transaction. Each attempt owns its object. */
    private PostView prepare(UUID id,UUID author,String title,String body,ImageUpload file) {
        var content=new PostContent(title,body);
        authors.requireAuthor(author);
        ImageData image=null;
        String key=null;
        if(file!=null) {
            policy.requireImagesEnabled();
            image=validator.read(file);
            key=UUID.randomUUID()+"."+image.extension();
            try { storage.upload(key,image); }
            catch(RuntimeException failure) { cleanupAfterFailure(key,failure); throw failure; }
        }
        return new PostView(id,author,"",content.title(),content.body(),
            key==null?null:storage.bucket(),key,image==null?null:image.type(),null);
    }
    private void cleanupAfterFailure(String key, RuntimeException failure) {
        try { storage.delete(storage.bucket(), key); }
        catch (RuntimeException cleanupFailure) {
            try { cleanup.enqueue(storage.bucket(),key); }
            catch (RuntimeException queueFailure) { failure.addSuppressed(queueFailure); }
            failure.addSuppressed(cleanupFailure);
        }
    }
    public void delete(UUID id) {
        var post = repository.post(id);
        transactions.run(() -> {
            if (post.imageKey()!=null) cleanup.enqueue(post.imageBucket(),post.imageKey());
            repository.deletePost(id);
        });
        cleanup.run();
    }
    public java.util.List<PostView> posts(UUID userId) { return repository.posts(userId); }
    public PostPage page(UUID userId, long requestedPage) {
        long total = repository.count(userId);
        long last = Math.max(1, total / PAGE_SIZE + (total % PAGE_SIZE == 0 ? 0 : 1));
        long number = Math.max(1, Math.min(requestedPage, last));
        var items = repository.page(userId, PAGE_SIZE, (number - 1) * PAGE_SIZE);
        return new PostPage(items, number, PAGE_SIZE, total);
    }
    public PostPage search(UUID userId,String query,String sort,long requestedPage) {
        query=query==null ? "" : query.strip();
        if(query.length()>200) throw new IllegalArgumentException("検索語は200文字以内にしてください。");
        if(!"newest".equals(sort) && !"oldest".equals(sort)) throw new IllegalArgumentException("並び順を選択してください。");
        long total=repository.searchCount(userId,query);
        long last=Math.max(1,total/PAGE_SIZE+(total%PAGE_SIZE==0?0:1));
        long number=Math.max(1,Math.min(requestedPage,last));
        return new PostPage(repository.search(userId,query,sort,PAGE_SIZE,(number-1)*PAGE_SIZE),number,PAGE_SIZE,total);
    }
    public UUID createOnce(UUID request,UUID author,String title,String body,ImageUpload image) {
        if(request==null) return create(author,title,body,image);
        // Fast retry: no image upload or author-count query for an already saved request.
        new PostContent(title,body);
        var hash=fingerprint(author,title,body,image);
        var existing=repository.request(request);
        if(existing.isPresent()) return replay(existing.get(),hash);
        var prepared=prepare(UUID.randomUUID(),author,title,body,image);
        UUID saved;
        try {
            saved=transactions.execute(() -> {
                // Serialize only the short DB commit, never a Storage network request.
                repository.lockRequest(request);
                var prior=repository.request(request);
                if(prior.isPresent()) return replay(prior.get(),hash);
                repository.insert(prepared);
                repository.saveRequest(request,hash,prepared.id());
                return prepared.id();
            });
        } catch(RuntimeException failure) {
            // A commit acknowledgement can be lost: verify references before deleting anything.
            if(prepared.imageKey()!=null) {
                try { cleanup.enqueue(prepared.imageBucket(),prepared.imageKey()); cleanup.run(); }
                catch(RuntimeException cleanupFailure) { failure.addSuppressed(cleanupFailure); }
            }
            throw failure;
        }
        if(!saved.equals(prepared.id()) && prepared.imageKey()!=null) {
            // Concurrent retry won. This attempt's distinct upload is not referenced.
            cleanup.enqueue(prepared.imageBucket(),prepared.imageKey()); cleanup.run();
        }
        return saved;
    }
    private static UUID replay(PostStore.Receipt receipt,String hash) {
        if(!receipt.fingerprint().equals(hash))
            throw new IllegalArgumentException("送信内容が変更されました。新しい投稿画面から保存してください。");
        if(receipt.postId()==null)
            throw new IllegalArgumentException("この送信で作成した投稿は削除済みです。新しい投稿画面から作成してください。");
        return receipt.postId();
    }
    private static String fingerprint(UUID author,String title,String body,ImageUpload image) {
        try {
            var hash=java.security.MessageDigest.getInstance("SHA-256");
            for(var value:new String[]{String.valueOf(author),title,body}) {
                var bytes=value.getBytes(java.nio.charset.StandardCharsets.UTF_8);
                hash.update(java.nio.ByteBuffer.allocate(4).putInt(bytes.length).array()); hash.update(bytes);
            }
            if(image!=null) hash.update(image.bytes());
            return java.util.HexFormat.of().formatHex(hash.digest());
        } catch(java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
    }
    public void update(UUID id,long version,String title,String body,ImageUpload file,boolean removeImage) {
        var original=repository.post(id);
        var content=new PostContent(title,body);
        if(removeImage && file!=null) throw new IllegalArgumentException("画像の差し替えと削除は同時に選べません。");
        String key=null; ImageData image=null;
        if(file!=null) {
            policy.requireImagesEnabled(); image=validator.read(file); key=UUID.randomUUID()+"."+image.extension();
            try { storage.upload(key,image); } catch(RuntimeException failure) { cleanupAfterFailure(key,failure); throw failure; }
        }
        var changed=new PostView(id,original.userId(),original.userName(),content.title(),content.body(),
            key!=null?storage.bucket():removeImage?null:original.imageBucket(),
            key!=null?key:removeImage?null:original.imageKey(),
            image!=null?image.type():removeImage?null:original.imageType(),original.createdAt(),version);
        try {
            transactions.run(() -> {
                if(!repository.update(changed,version)) throw new IllegalStateException("別の操作で更新されました。再読込みして内容を確認してください。");
                if((file!=null || removeImage) && original.imageKey()!=null) cleanup.enqueue(original.imageBucket(),original.imageKey());
            });
        } catch(RuntimeException failure) { if(key!=null) cleanupAfterFailure(key,failure); throw failure; }
        cleanup.run();
    }
    public PostView post(UUID id) { return repository.post(id); }
}
