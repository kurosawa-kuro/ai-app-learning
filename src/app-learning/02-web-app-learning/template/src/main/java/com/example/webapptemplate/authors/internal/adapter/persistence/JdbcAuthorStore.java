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
    private final List<com.example.webapptemplate.platform.UserReferences> references;
    public JdbcAuthorStore(JdbcClient db, JdbcTemplate jdbc, List<com.example.webapptemplate.platform.UserReferences> references) { this.db=db; this.jdbc=jdbc; this.references=references; }
    public List<AuthorView> authors() {
        var counts=new HashMap<UUID,Long>();
        references.forEach(source -> source.counts().forEach((id,count) -> counts.merge(id,count,Long::sum)));
        return choices().stream().map(user -> new AuthorView(user.id(),user.name(),counts.getOrDefault(user.id(),0L),user.createdAt())).toList();
    }
    public List<AuthorView> choices() {
        return db.sql("select id,name,0 as usage_count,created_at from app_users order by created_at,id").query(AuthorView.class).list();
    }
    public Optional<AuthorView> author(UUID id) {
        return db.sql("select id,name,0 as usage_count,created_at from app_users where id=:id").param("id",id)
            .query(AuthorView.class).optional().map(user -> new AuthorView(user.id(),user.name(),
                references.stream().mapToLong(source -> source.count(id)).sum(),user.createdAt()));
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
