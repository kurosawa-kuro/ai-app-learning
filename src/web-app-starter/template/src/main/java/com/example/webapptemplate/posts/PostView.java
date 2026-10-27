package com.example.webapptemplate.posts;

import java.util.UUID;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public record PostView(UUID id, UUID userId, String userName, String title, String body,
        String imageBucket, String imageKey, String imageType, OffsetDateTime createdAt) {
    public String createdLabel() { return createdAt == null ? "" : DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm").withZone(ZoneId.of("Asia/Tokyo")).format(createdAt); }
    public String excerpt() {
        var line = body.replaceAll("\\s+", " ").strip();
        return line.codePointCount(0, line.length()) <= 80 ? line : line.substring(0, line.offsetByCodePoints(0, 80)) + "…";
    }
}
