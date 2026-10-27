package com.example.webapptemplate.diary;
import com.example.webapptemplate.platform.*;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
@Repository
public class DiaryReferences implements UserReferences,ImageReferences {
 private final JdbcClient db;
 public DiaryReferences(JdbcClient db){this.db=db;}
 public Map<UUID,Long> counts(){var result=new HashMap<UUID,Long>();db.sql("select user_id,count(*) as n from diary_entries group by user_id").query((r,n)->{result.put(r.getObject(1,UUID.class),r.getLong(2));return 1;}).list();return result;}
 public long count(UUID user){return db.sql("select count(*) from diary_entries where user_id=:id").param("id",user).query(Long.class).single();}
 public boolean uses(String bucket,String key){return db.sql("select exists(select 1 from diary_photos where image_bucket=:bucket and image_key=:key)").param("bucket",bucket).param("key",key).query(Boolean.class).single();}
}
