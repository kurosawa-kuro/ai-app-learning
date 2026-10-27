package com.example.webapptemplate.posts.internal.adapter.persistence;

import com.example.webapptemplate.posts.PostView;
import com.example.webapptemplate.posts.internal.application.PostStore;
import com.example.webapptemplate.platform.ImageReferences;
import com.example.webapptemplate.platform.MissingEntity;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
@Repository
public class JdbcPostStore implements PostStore, ImageReferences {
    private final JdbcClient db;
    public JdbcPostStore(JdbcClient db) { this.db=db; }
    public long count(UUID userId) {
        var query = db.sql("select count(*) from posts " + (userId == null ? "" : "where user_id=:userId"));
        if (userId != null) query.param("userId", userId);
        return query.query(Long.class).single();
    }
    public List<PostView> page(UUID userId, int limit, long offset) {
        var query = db.sql("select p.*, u.name as user_name from posts p join app_users u on u.id=p.user_id "
                + (userId == null ? "" : "where p.user_id=:userId ")
                + "order by p.created_at desc, p.id limit :limit offset :offset")
                .param("limit", limit).param("offset", offset);
        if (userId != null) query.param("userId", userId);
        return query.query(PostView.class).list();
    }
    public List<PostView> posts(UUID userId) {
        var query = db.sql("select p.*, u.name as user_name from posts p join app_users u on u.id=p.user_id "
                + (userId == null ? "" : "where p.user_id=:userId ") + "order by p.created_at desc, p.id");
        if (userId != null) query.param("userId", userId);
        return query.query(PostView.class).list();
    }
    public PostView post(UUID id) {
        return db.sql("select p.*, u.name as user_name from posts p join app_users u on u.id=p.user_id where p.id=:id")
                .param("id", id).query(PostView.class).optional()
                .orElseThrow(() -> new MissingEntity("投稿が見つかりません。"));
    }
    public void insert(PostView p) {
        db.sql("insert into posts(id,user_id,title,body,image_bucket,image_key,image_type) values(:id,:user,:title,:body,:bucket,:key,:type)")
                .param("id", p.id()).param("user", p.userId()).param("title", p.title()).param("body", p.body())
                .param("bucket", p.imageBucket()).param("key", p.imageKey()).param("type", p.imageType()).update();
    }
    public void deletePost(UUID id) { db.sql("delete from posts where id=:id").param("id", id).update(); }

    public boolean uses(String bucket, String key) {
        return db.sql("select exists(select 1 from posts where image_bucket=:bucket and image_key=:key)")
            .param("bucket",bucket).param("key",key).query(Boolean.class).single();
    }
}
