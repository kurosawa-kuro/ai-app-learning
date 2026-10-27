package com.example.webapptemplate;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

@Service
class SeedDataService {
    record StoredImage(String bucket, String key) {}
    record Prepared(SeedFixtures.Entry entry, StoredImage image) {}
    record Result(int removed, int inserted, int images, int pendingCleanup) {}
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final ImageStorage storage;
    private final AppSettings settings;

    SeedDataService(JdbcTemplate jdbc, TransactionTemplate transaction, ImageStorage storage, AppSettings settings) {
        this.jdbc = jdbc; this.transaction = transaction; this.storage = storage; this.settings = settings;
    }

    String preview() {
        return "schema=" + jdbc.queryForObject("select current_schema()", String.class)
            + ", posts=" + jdbc.queryForObject("select count(*) from posts", Long.class)
            + ", attachedImages=" + jdbc.queryForObject("select count(*) from posts where image_key is not null", Long.class)
            + ", users=" + jdbc.queryForObject("select count(*) from app_users", Long.class)
            + ", imagesEnabled=" + settings.imagesEnabled()
            + ", storageConfigured=" + storage.configured()
            + ", pendingCleanup=" + pendingCleanup();
    }

    Result seed(boolean reset) {
        var prepared = new ArrayList<Prepared>();
        boolean committed = false;
        try {
            // Stage uploads before touching existing posts. Failed upload leaves the old feed intact.
            for (var entry : SeedFixtures.ENTRIES) {
                if (!reset && exists(entry.id())) continue;
                StoredImage image = null;
                if (entry.image() != null && settings.imagesEnabled()) {
                    storage.requireEnabled();
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

    boolean exists(UUID id) {
        return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from posts where id=?)", Boolean.class, id));
    }

    int pendingCleanup() {
        return jdbc.queryForObject("select count(*) from image_cleanup", Integer.class);
    }

    int cleanup() { return new ImageCleanup(jdbc, storage).run(); }
}
