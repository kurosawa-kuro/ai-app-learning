package com.example.webapptemplate.exports.internal.adapter.web;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.posts.PostOperations;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.dao.DataAccessException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class CsvExportController {
    private static final ZoneId JAPAN = ZoneId.of("Asia/Tokyo");
    private final PostOperations repository;
    private final AuthorOperations authors;

    public CsvExportController(PostOperations repository, AuthorOperations authors) { this.repository = repository; this.authors=authors; }

    @GetMapping("/admin/exports/users.csv")
    public ResponseEntity<byte[]> users() {
        var csv = new StringBuilder("\uFEFF");
        row(csv, "ユーザーID", "ユーザー名", "投稿数", "作成日時（日本時間）");
        for (var user : authors.authors()) {
            row(csv, user.id(), user.name(), user.postCount(), date(user.createdAt()));
        }
        return download("users", csv);
    }

    @GetMapping("/admin/exports/posts.csv")
    public ResponseEntity<byte[]> posts() {
        var csv = new StringBuilder("\uFEFF");
        row(csv, "投稿ID", "ユーザーID", "ユーザー名", "タイトル", "本文", "画像添付", "投稿日時（日本時間）");
        for (var post : repository.posts(null)) {
            row(csv, post.id(), post.userId(), post.userName(), post.title(), post.body(),
                post.imageKey() == null ? "なし" : "あり", date(post.createdAt()));
        }
        return download("posts", csv);
    }

    public static void row(StringBuilder csv, Object... values) {
        for (int i = 0; i < values.length; i++) {
            if (i > 0) csv.append(',');
            String value = values[i] == null ? "" : values[i].toString();
            String leading = value.stripLeading();
            // Quoting alone does not prevent spreadsheet formula execution.
            if ((!leading.isEmpty() && "=+-@".indexOf(leading.charAt(0)) >= 0)
                    || (!value.isEmpty() && "\t\r\n".indexOf(value.charAt(0)) >= 0)) value = "'" + value;
            csv.append('"').append(value.replace("\"", "\"\"")).append('"');
        }
        csv.append("\r\n");
    }

    private static String date(OffsetDateTime date) {
        return date == null ? "" : DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(date.atZoneSameInstant(JAPAN));
    }

    private ResponseEntity<byte[]> download(String type, StringBuilder csv) {
        String stamp = DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss").format(OffsetDateTime.now(JAPAN));
        return ResponseEntity.ok()
            .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + type + "-" + stamp + ".csv\"")
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body(csv.toString().getBytes(StandardCharsets.UTF_8));
    }

    @ExceptionHandler(DataAccessException.class)
    public ResponseEntity<String> unavailable() {
        return ResponseEntity.status(503).contentType(new MediaType("text", "plain", StandardCharsets.UTF_8))
            .header(HttpHeaders.CACHE_CONTROL, "no-store")
            .body("CSVを出力できませんでした。管理画面へ戻り、時間をおいて再試行してください。");
    }
}
