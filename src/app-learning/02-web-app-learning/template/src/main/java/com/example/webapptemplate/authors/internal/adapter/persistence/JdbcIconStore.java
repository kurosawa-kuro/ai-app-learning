package com.example.webapptemplate.authors.internal.adapter.persistence;

import com.example.webapptemplate.authors.UserIcons.Icon;
import com.example.webapptemplate.authors.internal.application.IconStore;
import com.example.webapptemplate.platform.ImageReferences;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
@Repository
public class JdbcIconStore implements IconStore, ImageReferences {
    private final JdbcTemplate jdbc;
    public JdbcIconStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
    public Optional<Icon> icon(UUID id) {
        return jdbc.query("select image_bucket,image_key,image_type from user_icons where user_id=?",
            (rs, row) -> new Icon(rs.getString(1), rs.getString(2), rs.getString(3)), id).stream().findFirst();
    }
    public Set<UUID> usersWithIcons() {
        return new HashSet<>(jdbc.queryForList("select user_id from user_icons", UUID.class));
    }

    public void save(UUID id, Icon icon) {
        jdbc.update("""
            insert into user_icons values (?,?,?,?) on conflict (user_id) do update
            set image_bucket=excluded.image_bucket,image_key=excluded.image_key,image_type=excluded.image_type
            """, id,icon.bucket(),icon.key(),icon.type());
    }
    public void delete(UUID id) { jdbc.update("delete from user_icons where user_id=?",id); }
    public boolean uses(String bucket,String key) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from user_icons where image_bucket=? and image_key=?)",Boolean.class,bucket,key));
    }
}
