package com.example.webapptemplate;
import org.junit.jupiter.api.Test;import java.time.OffsetDateTime;import static org.assertj.core.api.Assertions.*;
class LessonDateDisplayTests {@Test void midnightUsesJapanDateEvenWhenDatabaseReturnsUtc(){var at=OffsetDateTime.parse("2026-10-27T15:05:00Z");var entry=new com.example.webapptemplate.janken.JankenService.Round(null,null,null,null,null,null,null,0,null,at);assertThat(entry.createdLabel()).isEqualTo("2026/10/28 00:05");}}
