package com.example.webapptemplate.authors.internal.adapter.persistence;

import com.example.webapptemplate.authors.AuthorView;
import com.example.webapptemplate.authors.internal.application.AuthorStore;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
@Repository
public class JdbcAuthorStore implements AuthorStore {
    private final JdbcClient db;
    private final JdbcTemplate jdbc;
    public JdbcAuthorStore(JdbcClient db, JdbcTemplate jdbc) { this.db=db; this.jdbc=jdbc; }
    public List<AuthorView> authors() {
        return db.sql("select u.id, u.name, count(p.id) as post_count, u.created_at from app_users u left join posts p on p.user_id=u.id group by u.id order by u.created_at, u.id")
                .query(AuthorView.class).list();
    }
    public Optional<AuthorView> author(UUID id) {
        return db.sql("select u.id, u.name, count(p.id) as post_count, u.created_at from app_users u left join posts p on p.user_id=u.id where u.id=:id group by u.id")
                .param("id", id).query(AuthorView.class).optional();
    }
    public void rename(UUID id,String name) {
        db.sql("update app_users set name=:name where id=:id").param("id",id).param("name",name).update();
    }
    public UUID addAuthor(String name) {
        var id = UUID.randomUUID();
        db.sql("insert into app_users(id,name) values(:id,:name)").param("id", id).param("name", name).update();
        return id;
    }
    public void deleteAuthor(UUID id) {
        db.sql("delete from app_users where id=:id").param("id", id).update();
    }
    public UUID defaultUserId() {
        return jdbc.queryForObject("select default_user_id from app_settings where id = 1", UUID.class);
    }

    public void saveDefaultUser(UUID id) {
        jdbc.update("update app_settings set default_user_id = ?, updated_at = now() where id = 1", id);
    }

    public void lockUser(UUID id) {
        if (jdbc.queryForList("select id from app_users where id=? for update", UUID.class, id).isEmpty())
            throw new IllegalArgumentException("ユーザーが見つかりません。");
    }
}
