package com.example.webapptemplate.platform.internal.adapter.persistence;

import com.example.webapptemplate.platform.internal.application.CleanupQueue;
import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
@Repository
public class JdbcCleanupQueue implements CleanupQueue {
    private final JdbcTemplate jdbc;
    public JdbcCleanupQueue(JdbcTemplate jdbc) { this.jdbc = jdbc; }
    public void enqueue(String bucket, String key) { jdbc.update("insert into image_cleanup values (?,?) on conflict do nothing", bucket, key); }
    public int pending() { return jdbc.queryForObject("select count(*) from image_cleanup", Integer.class); }
    public List<ObjectRef> entries() { return jdbc.query("select image_bucket,image_key from image_cleanup", (rs,row) -> new ObjectRef(rs.getString(1),rs.getString(2))); }
    public void remove(ObjectRef image) { jdbc.update("delete from image_cleanup where image_bucket=? and image_key=?", image.bucket(),image.key()); }
}
