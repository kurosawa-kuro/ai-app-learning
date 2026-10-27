package com.example.webapptemplate;

import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Repository
class PostRepository {
    // Screens show Japan time regardless of the server zone (Render runs in UTC).
    private static final DateTimeFormatter DISPLAY = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm").withZone(ZoneId.of("Asia/Tokyo"));
    record Author(UUID id, String name, long postCount, OffsetDateTime createdAt) {
        public String initial() { return name.substring(0, name.offsetByCodePoints(0, 1)); }
        public String createdLabel() { return DISPLAY.format(createdAt); }
    }
    record Post(UUID id, UUID userId, String userName, String title, String body,
                String imageBucket, String imageKey, String imageType, OffsetDateTime createdAt) {
        public String createdLabel() { return createdAt == null ? "" : DISPLAY.format(createdAt); }
        public String excerpt() {
            var line = body.replaceAll("\\s+", " ").strip();
            return line.codePointCount(0, line.length()) <= 80 ? line : line.substring(0, line.offsetByCodePoints(0, 80)) + "…";
        }
    }
    private final JdbcClient db;
    PostRepository(JdbcClient db) { this.db = db; }

    List<Author> authors() {
        return db.sql("select u.id, u.name, count(p.id) as post_count, u.created_at from app_users u left join posts p on p.user_id=u.id group by u.id order by u.created_at, u.id")
                .query(Author.class).list();
    }
    Optional<Author> author(UUID id) {
        return db.sql("select u.id, u.name, count(p.id) as post_count, u.created_at from app_users u left join posts p on p.user_id=u.id where u.id=:id group by u.id")
                .param("id", id).query(Author.class).optional();
    }
    UUID addAuthor(String name) {
        var id = UUID.randomUUID();
        db.sql("insert into app_users(id,name) values(:id,:name)").param("id", id).param("name", name).update();
        return id;
    }
    void deleteAuthor(UUID id) {
        db.sql("delete from app_users where id=:id").param("id", id).update();
    }
    void requireAuthor(UUID id) {
        if (id == null || !db.sql("select exists(select 1 from app_users where id=:id)").param("id", id).query(Boolean.class).single())
            throw new IllegalArgumentException("投稿者を選択してください。");
    }
    List<Post> posts(UUID userId) {
        var query = db.sql("select p.*, u.name as user_name from posts p join app_users u on u.id=p.user_id "
                + (userId == null ? "" : "where p.user_id=:userId ") + "order by p.created_at desc, p.id");
        if (userId != null) query.param("userId", userId);
        return query.query(Post.class).list();
    }
    Post post(UUID id) {
        return db.sql("select p.*, u.name as user_name from posts p join app_users u on u.id=p.user_id where p.id=:id")
                .param("id", id).query(Post.class).optional()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
    void insert(Post p) {
        db.sql("insert into posts(id,user_id,title,body,image_bucket,image_key,image_type) values(:id,:user,:title,:body,:bucket,:key,:type)")
                .param("id", p.id()).param("user", p.userId()).param("title", p.title()).param("body", p.body())
                .param("bucket", p.imageBucket()).param("key", p.imageKey()).param("type", p.imageType()).update();
    }
    void deletePost(UUID id) { db.sql("delete from posts where id=:id").param("id", id).update(); }
}
