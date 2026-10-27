package com.example.webapptemplate;

import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.posts.PostOperations;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@Transactional
class PostPaginationTests {
    @Autowired PostOperations posts;
    @Autowired AuthorOperations authors;
    @Autowired JdbcTemplate jdbc;

    @Test void databasePagesAreBoundedStableFilteredAndExportRemainsComplete() {
        var author = authors.addAuthor("ページ検証");
        var other = authors.addAuthor("対象外");
        for (int i = 0; i < 23; i++) {
            jdbc.update("insert into posts(id,user_id,title,created_at) values (?,?,?, '2026-01-01T00:00:00Z')",
                UUID.randomUUID(), author, "ページ検証" + i);
        }
        posts.create(other, "対象外", "", null);
        var first = posts.page(author, 1);
        var second = posts.page(author, 2);
        var last = posts.page(author, 3);
        assertThat(first.total()).isEqualTo(23);
        assertThat(first.totalPages()).isEqualTo(3);
        assertThat(first.items()).hasSize(10);
        assertThat(second.items()).hasSize(10);
        assertThat(last.items()).hasSize(3);
        assertThat(first.hasPrevious()).isFalse();
        assertThat(first.hasNext()).isTrue();
        assertThat(last.hasNext()).isFalse();
        assertThat(second.firstItem()).isEqualTo(11);
        assertThat(second.lastItem()).isEqualTo(20);
        var combined = Stream.of(first, second, last).flatMap(p -> p.items().stream()).toList();
        assertThat(combined).allMatch(p -> p.userId().equals(author));
        assertThat(combined.stream().map(p -> p.id()).toList()).doesNotHaveDuplicates();
        assertThat(combined).isEqualTo(posts.posts(author));
        assertThat(posts.page(author, 2)).isEqualTo(second);
        assertThat(posts.page(author, -10).number()).isEqualTo(1);
        assertThat(posts.page(author, Long.MAX_VALUE).number()).isEqualTo(3);
        assertThat(posts.page(null, 1).items()).hasSize(10);
    }

    @Test void emptyFilterAndDeletingLastPageProduceValidPages() {
        var author = authors.addAuthor("空のページ検証");
        var empty = posts.page(author, 100);
        assertThat(empty.items()).isEmpty();
        assertThat(empty.number()).isEqualTo(1);
        assertThat(empty.total()).isZero();
        assertThat(empty.firstItem()).isZero();
        assertThat(empty.lastItem()).isZero();
        for (int i = 0; i < 11; i++) posts.create(author, "削除検証" + i, "", null);
        posts.delete(posts.page(author, 2).items().get(0).id());
        assertThat(posts.page(author, 2).number()).isEqualTo(1);
        assertThat(posts.page(author, 2).items()).hasSize(10);
    }
}
