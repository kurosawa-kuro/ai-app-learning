package com.example.webapptemplate;
import org.junit.jupiter.api.Test;import java.time.OffsetDateTime;import static org.assertj.core.api.Assertions.*;
class LessonDateDisplayTests {@Test void midnightUsesJapanDateEvenWhenDatabaseReturnsUtc(){var at=OffsetDateTime.parse("2026-10-27T15:05:00Z");var entry=new com.example.webapptemplate.shop.ShopService.Order(null,null,null,at,null,0);assertThat(entry.createdLabel()).isEqualTo("2026/10/28 00:05");}}
