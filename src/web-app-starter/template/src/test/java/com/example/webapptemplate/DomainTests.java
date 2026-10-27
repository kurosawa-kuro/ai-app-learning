package com.example.webapptemplate;

import com.example.webapptemplate.authors.internal.domain.AuthorDeletion;
import com.example.webapptemplate.authors.internal.domain.AuthorName;
import com.example.webapptemplate.posts.internal.domain.PostContent;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class DomainTests {
    @Test void postRulesApplyWithoutHttpOrDatabase() {
        assertThat(new PostContent(" タイトル ", " 本文 ")).isEqualTo(new PostContent("タイトル", "本文"));
        assertThatCode(() -> new PostContent("あ".repeat(120), "あ".repeat(5000))).doesNotThrowAnyException();
        assertThatThrownBy(() -> new PostContent("あ".repeat(121), "")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new PostContent("題", "あ".repeat(5001))).isInstanceOf(IllegalArgumentException.class);
        assertThat(PostContent.errors(null, null)).containsKeys("title", "body");
    }
    @Test void authorRulesProtectNameAndExistingPosts() {
        assertThat(new AuthorName(" 葵 ").value()).isEqualTo("葵");
        assertThatThrownBy(() -> new AuthorName(" ")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new AuthorName("あ".repeat(81))).isInstanceOf(IllegalArgumentException.class);
        assertThatCode(() -> AuthorDeletion.requireNoPosts(0)).doesNotThrowAnyException();
        assertThatThrownBy(() -> AuthorDeletion.requireNoPosts(1)).hasMessageContaining("投稿がある");
    }
}
