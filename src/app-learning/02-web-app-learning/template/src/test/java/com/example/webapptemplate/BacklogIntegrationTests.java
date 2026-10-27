package com.example.webapptemplate;

import com.example.webapptemplate.authors.*;
import com.example.webapptemplate.platform.*;
import com.example.webapptemplate.platform.internal.adapter.image.ImageIoCodec;
import com.example.webapptemplate.platform.internal.adapter.persistence.SpringUnitOfWork;
import com.example.webapptemplate.posts.*;
import com.example.webapptemplate.posts.internal.application.PostService;
import com.example.webapptemplate.posts.internal.adapter.persistence.JdbcPostStore;
import com.example.webapptemplate.settings.*;
import com.example.webapptemplate.bootstrap.internal.adapter.persistence.SeedFixtures;
import java.nio.file.*;
import java.util.*;
import java.util.concurrent.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(properties={"spring.datasource.hikari.schema=app_template_backlog_test","spring.flyway.schemas=app_template_backlog_test","spring.flyway.default-schema=app_template_backlog_test"})
class BacklogIntegrationTests {
    @Autowired JdbcTemplate jdbc;
    @Autowired AuthorOperations authors;
    @Autowired DataSource source;
    @Autowired PlatformTransactionManager manager;
    ImageStore storage;
    ImageCleanup cleanup;
    PostService service;
    Map<String,byte[]> objects;
    UUID author;
    @BeforeEach void setup() {
        assertThat(jdbc.queryForObject("select current_schema()",String.class)).isEqualTo("app_template_backlog_test");
        jdbc.execute("alter table posts drop constraint if exists backlog_reject");
        jdbc.update("delete from posts"); jdbc.update("delete from app_users"); jdbc.update("delete from image_cleanup"); jdbc.update("delete from post_requests");
        objects=new ConcurrentHashMap<>(); storage=mock(ImageStore.class);
        when(storage.bucket()).thenReturn("backlog-test"); when(storage.configured()).thenReturn(true);
        doAnswer(call->{objects.put(call.getArgument(0),((ImageData)call.getArgument(1)).bytes());return null;}).when(storage).upload(anyString(),any());
        when(storage.download(anyString(),anyString())).thenAnswer(call->{var value=objects.get(call.getArgument(1));if(value==null)throw new MissingImage();return value;});
        doAnswer(call->{objects.remove(call.getArgument(1));return null;}).when(storage).delete(anyString(),anyString());
        cleanup=TestInfrastructure.cleanup(jdbc,storage);
        var policy=mock(FeaturePolicy.class,CALLS_REAL_METHODS); when(policy.imagesEnabled()).thenReturn(true);
        service=new PostService(new JdbcPostStore(JdbcClient.create(jdbc)),storage,new ImageIoCodec(),new SpringUnitOfWork(new TransactionTemplate(manager)),authors,policy,cleanup);
        author=authors.addAuthor("編集検証");
    }
    ImageUpload image() { return new ImageUpload(SeedFixtures.image("focus").bytes()); }
    @Test void editKeepsReplacesRemovesAndRejectsStaleVersions() {
        var id=service.create(author,"元のタイトル","元の本文",image()); var first=service.post(id);
        service.update(id,0,"本文だけ変更","変更本文",null,false);
        assertThat(service.post(id).imageKey()).isEqualTo(first.imageKey());
        assertThatThrownBy(()->service.update(id,0,"競合","",null,false)).hasMessageContaining("別の操作");
        service.update(id,1,"差し替え","",image(),false); var replaced=service.post(id);
        assertThat(replaced.imageKey()).isNotEqualTo(first.imageKey()); assertThat(objects).doesNotContainKey(first.imageKey());
        service.update(id,2,"画像解除","",null,true);
        assertThat(service.post(id).imageKey()).isNull(); assertThat(objects).isEmpty();
    }
    @Test void failedDatabaseEditKeepsOldPostAndImageAndCompensatesNewUpload() {
        var id=service.create(author,"元のタイトル","元の本文",image()); var before=service.post(id);
        jdbc.execute("alter table posts add constraint backlog_reject check (title='元のタイトル')");
        try { assertThatThrownBy(()->service.update(id,0,"変更禁止","",image(),false)).isInstanceOf(org.springframework.dao.DataAccessException.class); }
        finally { jdbc.execute("alter table posts drop constraint backlog_reject"); }
        assertThat(service.post(id)).isEqualTo(before); assertThat(objects).hasSize(1).containsKey(before.imageKey());
    }
    @Test void compensationFailureIsQueuedAndRetryNeverDeletesReferencedImage() {
        var id=service.create(author,"元のタイトル","",image()); var before=service.post(id);
        doThrow(new IllegalStateException("offline")).when(storage).delete(anyString(),anyString());
        service.update(id,0,"差し替え","",image(),false);
        assertThat(cleanup.pending()).isEqualTo(1);
        cleanup.enqueue("backlog-test",service.post(id).imageKey());
        doAnswer(call->{objects.remove(call.getArgument(1));return null;}).when(storage).delete(anyString(),anyString());
        assertThat(cleanup.run()).isEqualTo(1);
        assertThat(objects).doesNotContainKey(before.imageKey()).containsKey(service.post(id).imageKey());
    }
    @Test void sameRequestIsIdempotentUnderConcurrentRetries() throws Exception {
        var key=UUID.randomUUID(); var pool=Executors.newFixedThreadPool(2);
        try {
            var first=pool.submit(()->service.createOnce(key,author,"同じ送信","",image()));
            var second=pool.submit(()->service.createOnce(key,author,"同じ送信","",image()));
            assertThat(first.get(30,TimeUnit.SECONDS)).isEqualTo(second.get(30,TimeUnit.SECONDS));
            assertThat(service.posts(author)).hasSize(1); assertThat(objects).hasSize(1);
            assertThatThrownBy(()->service.createOnce(key,author,"異なる内容","",null)).hasMessageContaining("変更されました");
        } finally { pool.shutdownNow(); }
    }
    @Test void authorRenamePreservesReferencesAndSearchIsLiteralAndSorted() {
        var first=service.create(author,"100%_の記録","検索本文",null);
        var second=service.create(author,"別の記録","検索本文",null);
        authors.saveDefaultUser(author); authors.rename(author,"名前変更");
        assertThat(service.post(first).userName()).isEqualTo("名前変更"); assertThat(authors.defaultUserId()).isEqualTo(author);
        assertThat(service.search(author,"%_","newest",1).items()).extracting(PostView::id).containsExactly(first);
        jdbc.update("update posts set created_at='2020-01-01' where id=?",first);
        assertThat(service.search(author,"検索本文","oldest",1).items()).extracting(PostView::id).containsExactly(first,second);
        assertThat(service.search(author,"一致なし","newest",5).total()).isZero();
        assertThatThrownBy(()->authors.rename(author," ")).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void failedIdempotentCreateKeepsCleanupAfterTheOuterTransactionRollsBack() {
        jdbc.execute("alter table posts add constraint backlog_reject check (title='許可したタイトル')");
        doThrow(new IllegalStateException("offline")).when(storage).delete(anyString(),anyString());
        try { assertThatThrownBy(()->service.createOnce(UUID.randomUUID(),author,"登録拒否","",image())).isInstanceOf(org.springframework.dao.DataAccessException.class); }
        finally { jdbc.execute("alter table posts drop constraint backlog_reject"); }
        assertThat(service.posts(author)).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from post_requests",Integer.class)).isZero();
        assertThat(cleanup.pending()).isEqualTo(1);
        doAnswer(call->{objects.remove(call.getArgument(1));return null;}).when(storage).delete(anyString(),anyString());
        assertThat(cleanup.run()).isZero(); assertThat(objects).isEmpty();
    }
}
