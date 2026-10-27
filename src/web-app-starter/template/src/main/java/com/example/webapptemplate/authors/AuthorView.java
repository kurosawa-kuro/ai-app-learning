package com.example.webapptemplate.authors;

import java.util.UUID;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public record AuthorView(UUID id, String name, long postCount, OffsetDateTime createdAt) {
    public String initial() { return name.substring(0, name.offsetByCodePoints(0, 1)); }
    public String createdLabel() { return DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm").withZone(ZoneId.of("Asia/Tokyo")).format(createdAt); }
}
