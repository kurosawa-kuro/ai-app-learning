package com.example.webapptemplate;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class CsvExportTests {
    @Test void escapesMultilineTextAndNeutralizesSpreadsheetFormulas() {
        var csv = new StringBuilder();
        CsvExportController.row(csv, "日本語,メモ", "彼は\"はい\"と答えた", "一行目\n二行目", null,
            "=1+2", "  +1", "-1", "@SUM(A1)", "\t文字列", "普通の本文");
        assertThat(csv.toString()).isEqualTo("\"日本語,メモ\",\"彼は\"\"はい\"\"と答えた\",\"一行目\n二行目\",\"\","
            + "\"'=1+2\",\"'  +1\",\"'-1\",\"'@SUM(A1)\",\"'\t文字列\",\"普通の本文\"\r\n");
    }

    @Test void downloadsUtf8BomCsvWithRelationshipsButNoStorageInternals() throws Exception {
        var repository = mock(PostRepository.class);
        var user = UUID.randomUUID(); var post = UUID.randomUUID();
        var date = OffsetDateTime.parse("2026-10-27T00:30:00Z");
        when(repository.posts(null)).thenReturn(List.of(new PostRepository.Post(post, user, "サンプル", "タイトル",
            "一行目\n二行目", "private-bucket", "private-key", "image/png", date)));
        when(repository.authors()).thenReturn(List.of(new PostRepository.Author(user, "サンプル", 1, date)));
        var mvc = MockMvcBuilders.standaloneSetup(new CsvExportController(repository)).build();
        var response = mvc.perform(get("/admin/exports/posts.csv"))
            .andExpect(status().isOk()).andExpect(content().contentType("text/csv;charset=UTF-8"))
            .andExpect(header().string("Cache-Control", "no-store")).andReturn().getResponse();
        assertThat(response.getHeader("Content-Disposition")).matches("attachment; filename=\"posts-\\d{8}-\\d{6}\\.csv\"");
        byte[] bytes = response.getContentAsByteArray();
        assertThat(bytes).startsWith((byte) 0xef, (byte) 0xbb, (byte) 0xbf);
        assertThat(new String(bytes, StandardCharsets.UTF_8)).contains(post.toString(), user.toString(),
            "\"一行目\n二行目\"", "\"あり\"", "2026-10-27T09:30:00+09:00")
            .doesNotContain("private-bucket", "private-key", "image/png");
        var users = mvc.perform(get("/admin/exports/users.csv")).andExpect(status().isOk()).andReturn().getResponse();
        assertThat(users.getContentAsString(StandardCharsets.UTF_8)).contains(user.toString(), "\"サンプル\",\"1\"");
    }

    @Test void emptyExportHasHeadersAndDatabaseFailureIsNotADownload() throws Exception {
        var repository = mock(PostRepository.class);
        when(repository.authors()).thenReturn(List.of());
        var mvc = MockMvcBuilders.standaloneSetup(new CsvExportController(repository)).build();
        var empty = mvc.perform(get("/admin/exports/users.csv")).andExpect(status().isOk()).andReturn().getResponse();
        assertThat(empty.getContentAsString(StandardCharsets.UTF_8)).isEqualTo("\uFEFF\"ユーザーID\",\"ユーザー名\",\"投稿数\",\"作成日時（日本時間）\"\r\n");
        when(repository.posts(null)).thenThrow(new DataAccessResourceFailureException("private connection details"));
        mvc.perform(get("/admin/exports/posts.csv")).andExpect(status().isServiceUnavailable())
            .andExpect(header().doesNotExist("Content-Disposition"))
            .andExpect(content().string("CSVを出力できませんでした。管理画面へ戻り、時間をおいて再試行してください。"));
    }
}
