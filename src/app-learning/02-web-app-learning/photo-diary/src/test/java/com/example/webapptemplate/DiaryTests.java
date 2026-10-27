package com.example.webapptemplate;

import com.example.webapptemplate.diary.DiaryService;
import com.example.webapptemplate.authors.AuthorOperations;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
@Transactional
class DiaryTests {
    @Autowired DiaryService diary;
    @Autowired AuthorOperations authors;

    @Test void savesManualTextTagsAndRejectsChangedReplayAndReferencedUserDeletion() {
        var user = authors.addAuthor("日記の確認用");
        var id = UUID.randomUUID();
        var date = LocalDate.of(2026, 10, 1);
        diary.save(id, user, date, "今日の発見", "自分で手直しした文章。", "散歩,発見,散歩", List.of());
        assertThat(diary.save(id, user, date, "今日の発見", "自分で手直しした文章。", "散歩,発見,散歩", List.of())).isEqualTo(id);
        assertThat(diary.entry(id).body()).isEqualTo("自分で手直しした文章。");
        assertThat(diary.page("発見", 1).entries()).extracting(DiaryService.Entry::id).contains(id);
        assertThatThrownBy(() -> diary.save(id, user, date, "別の内容", "本文", "", List.of())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> authors.deleteAuthor(user)).isInstanceOf(IllegalArgumentException.class);
        assertThat(authors.author(user)).isPresent();
    }

    @Test void pagesAndFiltersRemainStableWithThirteenEntries() {
        var user = authors.addAuthor("ページ確認");
        var tag = UUID.randomUUID().toString().substring(0, 20);
        diary.addTag(tag);
        for (int i = 0; i < 13; i++) diary.save(UUID.randomUUID(), user, LocalDate.of(2026,10,1).plusDays(i), "記録" + i, "本文", tag, List.of());
        var first = diary.page(tag, 1);
        var second = diary.page(tag, 2);
        assertThat(first.total()).isEqualTo(13);
        assertThat(first.entries()).hasSize(10);
        assertThat(second.entries()).hasSize(3);
        assertThat(first.entries()).doesNotContainAnyElementsOf(second.entries());
        assertThat(diary.page(tag, Long.MAX_VALUE).page()).isEqualTo(2);
        assertThat(diary.page("存在しないタグ", 9).page()).isEqualTo(1);
        assertThatThrownBy(() -> diary.save(UUID.randomUUID(), user, LocalDate.now(), " ", "本文", "", List.of())).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> diary.save(UUID.randomUUID(), user, LocalDate.now(), "題名", "本文", "1,2,3,4,5,6", List.of())).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void tagRenameKeepsManyToManyLinksAndUsedTagsCannotBeDeleted() {
        var name="タグ"+UUID.randomUUID().toString().substring(0,8);
        diary.addTag(name);
        var tag=diary.tagCatalog().stream().filter(t->t.name().equals(name)).findFirst().orElseThrow();
        var user=authors.addAuthor("タグ確認");
        var first=diary.save(UUID.randomUUID(),user,LocalDate.now(),"一つ目","本文",name+",散歩",List.of());
        var second=diary.save(UUID.randomUUID(),user,LocalDate.now(),"二つ目","本文",name,List.of());
        diary.renameTag(tag.id(),tag.version(),name+"変更");
        assertThat(diary.entry(first).tags()).contains(name+"変更","散歩");
        assertThat(diary.page(name+"変更,散歩",1).entries()).extracting(DiaryService.Entry::id).contains(first,second);
        assertThatThrownBy(()->diary.renameTag(tag.id(),tag.version(),"競合")).isInstanceOf(IllegalArgumentException.class);
    }
}
