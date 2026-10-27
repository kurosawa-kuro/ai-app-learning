package com.example.webapptemplate;

import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.multipart.MultipartFile;

@Service
class UserIconService {
    record Icon(String bucket, String key, String type) {}
    private final JdbcTemplate jdbc;
    private final TransactionTemplate transaction;
    private final ImageStorage storage;
    private final ImageValidator validator;
    private final PostRepository repository;
    private final ImageCleanup cleanup;
    UserIconService(JdbcTemplate jdbc, TransactionTemplate transaction, ImageStorage storage, ImageValidator validator, PostRepository repository) {
        this.jdbc = jdbc; this.transaction = transaction; this.storage = storage; this.validator = validator;
        this.repository = repository; this.cleanup = new ImageCleanup(jdbc, storage);
    }
    Optional<Icon> icon(UUID id) {
        return jdbc.query("select image_bucket,image_key,image_type from user_icons where user_id=?",
            (rs, row) -> new Icon(rs.getString(1), rs.getString(2), rs.getString(3)), id).stream().findFirst();
    }
    Set<UUID> usersWithIcons() {
        return new HashSet<>(jdbc.queryForList("select user_id from user_icons", UUID.class));
    }
    String url(UUID id) { return storage.configured() && icon(id).isPresent() ? "/admin/users/" + id + "/icon" : null; }
    private void lockUser(UUID id) {
        if (jdbc.queryForList("select id from app_users where id=? for update", UUID.class, id).isEmpty())
            throw new IllegalArgumentException("ユーザーが見つかりません。");
    }
    int save(UUID id, MultipartFile file) {
        repository.requireAuthor(id);
        if (file == null || file.isEmpty()) throw new IllegalArgumentException("アイコンにする画像を選択してください。");
        var image = square(validator.read(file));
        String key = UUID.randomUUID() + ".png";
        boolean committed = false;
        try {
            storage.upload(key, image);
            transaction.executeWithoutResult(status -> {
                lockUser(id);
                icon(id).ifPresent(old -> cleanup.enqueue(old.bucket(), old.key()));
                jdbc.update("""
                    insert into user_icons values (?,?,?,?) on conflict (user_id) do update
                    set image_bucket=excluded.image_bucket,image_key=excluded.image_key,image_type=excluded.image_type
                    """, id, storage.bucket(), key, image.type());
            });
            committed = true;
        } finally {
            if (!committed) {
                cleanup.enqueue(storage.bucket(), key);
                cleanup.run();
            }
        }
        return cleanup.run();
    }
    int remove(UUID id) {
        transaction.executeWithoutResult(status -> {
            lockUser(id);
            icon(id).ifPresent(old -> cleanup.enqueue(old.bucket(), old.key()));
            jdbc.update("delete from user_icons where user_id=?", id);
        });
        return cleanup.run();
    }
    int deleteUser(UUID id) {
        transaction.executeWithoutResult(status -> {
            lockUser(id);
            icon(id).ifPresent(old -> cleanup.enqueue(old.bucket(), old.key()));
            repository.deleteAuthor(id); // FK rejects users with posts; the whole transaction rolls back.
        });
        return cleanup.run();
    }
    static ImageValidator.Image square(ImageValidator.Image image) {
        try {
            var input = ImageIO.read(new ByteArrayInputStream(image.bytes()));
            int side = Math.min(input.getWidth(), input.getHeight());
            int x = (input.getWidth() - side) / 2, y = (input.getHeight() - side) / 2;
            var output = new BufferedImage(256, 256, BufferedImage.TYPE_INT_ARGB);
            var g = output.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.drawImage(input, 0, 0, 256, 256, x, y, x + side, y + side, null); g.dispose();
            var bytes = new ByteArrayOutputStream(); ImageIO.write(output, "png", bytes);
            return new ImageValidator.Image(bytes.toByteArray(), "image/png", "png");
        } catch (IOException failure) { throw new IllegalArgumentException("アイコンを作成できませんでした。別の画像を選択してください。"); }
    }
}
