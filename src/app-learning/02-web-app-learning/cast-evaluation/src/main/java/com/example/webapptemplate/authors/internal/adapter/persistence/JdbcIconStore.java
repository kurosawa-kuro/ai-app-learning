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
        return jdbc.query("select icon_bucket,icon_key,icon_type from app_users where id=? and icon_key is not null",
            (rs, row) -> new Icon(rs.getString(1), rs.getString(2), rs.getString(3)), id).stream().findFirst();
    }
    public Set<UUID> usersWithIcons() {
        return new HashSet<>(jdbc.queryForList("select id from app_users where icon_key is not null", UUID.class));
    }

    public void save(UUID id, Icon icon) {
        jdbc.update("""
            update app_users set icon_bucket=?,icon_key=?,icon_type=? where id=?
            """, icon.bucket(),icon.key(),icon.type(),id);
    }
    public void delete(UUID id) { jdbc.update("update app_users set icon_bucket=null,icon_key=null,icon_type=null where id=?",id); }
    public boolean uses(String bucket,String key) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from app_users where icon_bucket=? and icon_key=?)",Boolean.class,bucket,key));
    }
}
