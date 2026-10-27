package com.example.webapptemplate;

import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.SingleConnectionDataSource;
import static org.assertj.core.api.Assertions.*;

@SpringBootTest
class DatabaseRedesignTests {
    @Autowired DataSource source;

    @Test void upgradesPopulatedV9WithoutLosingPostsIconsSettingsOrHistoricalData() throws Exception {
        String schema="redesign_test_"+UUID.randomUUID().toString().replace("-","").substring(0,12);
        var flyway=Flyway.configure().dataSource(source).schemas(schema).defaultSchema(schema);
        try {
            flyway.target("9").load().migrate();
            try(var connection=source.getConnection()) {
                connection.setSchema(schema);
                var db=new JdbcTemplate(new SingleConnectionDataSource(connection,true));
                UUID user=UUID.randomUUID(),post=UUID.randomUUID(),request=UUID.randomUUID();
                db.update("insert into app_users(id,name) values (?,?)",user,"移行前の投稿者");
                db.update("insert into user_icons values (?,?,?,?)",user,"bucket","icon.png","image/png");
                db.update("insert into posts(id,user_id,title,body,image_bucket,image_key,image_type) values (?,?,?,?,?,?,?)",post,user,"元の投稿","元の本文","bucket","post.png","image/png");
                db.update("insert into app_settings(id,images_enabled,ai_enabled,default_user_id,allowed_ai_models) values(1,true,true,?,?)",user,"gemini-test-b\ngemini-test-a");
                db.update("insert into post_requests(request_id,fingerprint,post_id) values(?,?,?)",request,"a".repeat(64),post);
                db.update("insert into operation_events(id,operation,result) values(?,'old-event','SUCCESS')",UUID.randomUUID());
                db.update("insert into ai_requests(request_id,owner_id,fingerprint,prompt_version,model,result_text) values(?,'old-owner',?,'v1','gemini-test-a','残す下書き')",UUID.randomUUID(),"b".repeat(64));
                flyway.target("latest").load().migrate();
                assertThat(db.queryForObject("select title||body from posts where id=?",String.class,post)).isEqualTo("元の投稿元の本文");
                assertThat(db.queryForObject("select image_key from posts where id=?",String.class,post)).isEqualTo("post.png");
                assertThat(db.queryForObject("select icon_key from app_users where id=?",String.class,user)).isEqualTo("icon.png");
                assertThat(db.queryForObject("select default_user_id from app_settings",UUID.class)).isEqualTo(user);
                assertThat(db.queryForObject("select images_enabled and ai_enabled from app_settings",Boolean.class)).isTrue();
                assertThat(db.queryForList("select model_id from allowed_ai_models order by position",String.class)).containsExactly("gemini-test-b","gemini-test-a");
                assertThat(db.queryForObject("select count(*) from "+schema+"_legacy.operation_events",Integer.class)).isEqualTo(1);
                assertThat(db.queryForObject("select result_text from "+schema+"_legacy.ai_requests",String.class)).isEqualTo("残す下書き");
                assertThat(db.queryForList("select table_name from information_schema.tables where table_schema=? and table_name<>'flyway_schema_history' order by table_name",String.class,schema))
                    .containsExactly("allowed_ai_models","app_settings","app_users","image_cleanup","post_requests","posts","shop_items","shop_orders","shop_products");
                assertThatThrownBy(()->db.update("update app_users set icon_type=null where id=?",user)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
                assertThatThrownBy(()->db.update("insert into post_requests(request_id,fingerprint,post_id) values(?,?,?)",UUID.randomUUID(),"c".repeat(64),UUID.randomUUID())).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
                assertThatThrownBy(()->db.update("delete from app_users where id=?",user)).isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
                db.update("delete from posts where id=?",post);
                assertThat(db.queryForObject("select post_id from post_requests where request_id=?",UUID.class,request)).isNull();
                db.update("delete from app_users where id=?",user);
                assertThat(db.queryForObject("select default_user_id from app_settings",UUID.class)).isNull();
            }
        } finally {
            // Only the randomly named schemas created by this test; never application data.
            if(!schema.matches("redesign_test_[0-9a-f]{12}")) throw new IllegalStateException("Unexpected test schema");
            var db=new JdbcTemplate(source);
            db.execute("drop schema if exists "+schema+" cascade");
            db.execute("drop schema if exists "+schema+"_legacy cascade");
        }
    }
}
