package com.example.webapptemplate.bootstrap.internal.adapter.persistence;
import com.example.webapptemplate.platform.ImageCleanup;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.settings.FeaturePolicy;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class SeedDataService {
    public record StoredImage(String bucket, String key) {}
    public record Prepared(SeedFixtures.Entry entry, StoredImage image) {}
    public record Result(int removed, int inserted, int images, int pendingCleanup) {}
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final ImageStore storage;
    private final FeaturePolicy settings;
    private final ImageCleanup cleanup;

    public SeedDataService(JdbcTemplate jdbc, TransactionTemplate transaction, ImageStore storage, FeaturePolicy settings, ImageCleanup cleanup) {
        this.cleanup=cleanup;
        this.jdbc = jdbc; this.transaction = transaction; this.storage = storage; this.settings = settings;
    }

    public String preview() {
        return "schema=" + jdbc.queryForObject("select current_schema()", String.class)
            + ", posts=" + jdbc.queryForObject("select count(*) from posts", Long.class)
            + ", attachedImages=" + jdbc.queryForObject("select count(*) from posts where image_key is not null", Long.class)
            + ", users=" + jdbc.queryForObject("select count(*) from app_users", Long.class)
            + ", imagesEnabled=" + settings.imagesEnabled()
            + ", storageConfigured=" + storage.configured()
            + ", pendingCleanup=" + pendingCleanup();
    }

    public Result seed(boolean reset) {
        var prepared = new ArrayList<Prepared>();
        boolean committed = false;
        try {
            // Stage uploads before touching existing posts. Failed upload leaves the old feed intact.
            for (var entry : SeedFixtures.ENTRIES) {
                if (!reset && exists(entry.id())) continue;
                StoredImage image = null;
                if (entry.image() != null && settings.imagesEnabled()) {
                    settings.requireImagesEnabled();
                    image = new StoredImage(storage.bucket(), UUID.randomUUID() + ".png");
                }
                prepared.add(new Prepared(entry, image));
                if (image != null) storage.upload(image.key(), SeedFixtures.image(entry.image()));
            }
            Integer removed = transaction.execute(status -> {
                jdbc.execute("lock table posts in exclusive mode");
                int deleted = 0;
                if (reset) {
                    jdbc.update("""
                        insert into image_cleanup(image_bucket, image_key)
                        select image_bucket, image_key from posts where image_key is not null
                        on conflict do nothing
                        """);
                    deleted = jdbc.update("delete from posts");
                }
                for (var author : SeedFixtures.AUTHORS) {
                    jdbc.update("insert into app_users(id, name) values (?, ?) on conflict (id) do nothing",
                        author.id(), author.name());
                }
                var today = OffsetDateTime.now(ZoneOffset.ofHours(9)).withHour(9).withMinute(0).withSecond(0).withNano(0);
                for (var item : prepared) {
                    var entry = item.entry(); var image = item.image();
                    jdbc.update("""
                        insert into posts(id,user_id,title,body,image_bucket,image_key,image_type,created_at)
                        values (?,?,?,?,?,?,?,?)
                        """, entry.id(), entry.author(), entry.title(), entry.body().strip(),
                        image == null ? null : image.bucket(), image == null ? null : image.key(),
                        image == null ? null : "image/png", today.minusDays(entry.daysAgo()));
                }
                return deleted;
            });
            committed = true;
            return new Result(removed, prepared.size(), (int) prepared.stream().filter(p -> p.image() != null).count(), cleanup());
        } finally {
            if (!committed) {
                for (var item : prepared) if (item.image() != null) {
                    // Store retry information before attempting compensation; never print credentials.
                    jdbc.update("insert into image_cleanup values (?,?) on conflict do nothing",
                        item.image().bucket(), item.image().key());
                }
                cleanup();
            }
        }
    }

    public boolean exists(UUID id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from posts where id=?)", Boolean.class, id));
    }

    /** Attach only missing demo images; never reset posts or overwrite an existing image. */
    public int fillMissingImages() {
        settings.requireImagesEnabled();
        int added = 0;
        for (var entry : SeedFixtures.ENTRIES) {
            if (entry.image() == null || !Boolean.TRUE.equals(jdbc.queryForObject(
                    "select exists(select 1 from posts where id=? and image_key is null)", Boolean.class, entry.id()))) continue;
            String key = UUID.randomUUID() + ".png";
            boolean attached = false;
            try {
                storage.upload(key, SeedFixtures.image(entry.image()));
                int updated = transaction.execute(status -> jdbc.update("""
                    update posts set image_bucket=?, image_key=?, image_type='image/png'
                    where id=? and image_key is null
                    """, storage.bucket(), key, entry.id()));
                attached = updated == 1;
                added += updated;
            } finally {
                if (!attached) {
                    cleanup.enqueue(storage.bucket(), key);
                    cleanup.run();
                }
            }
        }
        return added;
    }

    public int pendingCleanup() {
        return jdbc.queryForObject("select count(*) from image_cleanup", Integer.class);
    }

    public int cleanup() { return cleanup.run(); }
}
