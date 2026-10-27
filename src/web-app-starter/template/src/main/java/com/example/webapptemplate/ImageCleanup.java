package com.example.webapptemplate;

import org.springframework.jdbc.core.JdbcTemplate;

/** Enqueue inside the metadata transaction; retry Storage deletion after commit. */
class ImageCleanup {
    record ObjectRef(String bucket, String key) {}
    private final JdbcTemplate jdbc;
    private final ImageStorage storage;
    ImageCleanup(JdbcTemplate jdbc, ImageStorage storage) { this.jdbc = jdbc; this.storage = storage; }
    void enqueue(String bucket, String key) {
        jdbc.update("insert into image_cleanup values (?,?) on conflict do nothing", bucket, key);
    }
    int pending() { return jdbc.queryForObject("select count(*) from image_cleanup", Integer.class); }
    int run() {
        for (var image : jdbc.query("select image_bucket,image_key from image_cleanup",
                (rs, row) -> new ObjectRef(rs.getString(1), rs.getString(2)))) {
            if (Boolean.TRUE.equals(jdbc.queryForObject("""
                select exists(select 1 from posts where image_bucket=? and image_key=?
                union all select 1 from user_icons where image_bucket=? and image_key=?)
                """, Boolean.class, image.bucket(), image.key(), image.bucket(), image.key()))) continue;
            try {
                storage.delete(image.bucket(), image.key());
                jdbc.update("delete from image_cleanup where image_bucket=? and image_key=?", image.bucket(), image.key());
            } catch (IllegalStateException unavailable) { /* Keep retry information. */ }
        }
        return pending();
    }
}
