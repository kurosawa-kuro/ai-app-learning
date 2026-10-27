package com.example.webapptemplate.learning;
import com.example.webapptemplate.platform.UserReferences;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
@Repository public class LearningReferences implements UserReferences {
 private final JdbcClient db;public LearningReferences(JdbcClient db){this.db=db;}
 public long count(UUID user){return db.sql("select count(*) from learning_entries where user_id=:id").param("id",user).query(Long.class).single();}
 public Map<UUID,Long> counts(){var m=new HashMap<UUID,Long>();db.sql("select user_id,count(*) from learning_entries group by user_id").query((r,n)->{m.put(r.getObject(1,UUID.class),r.getLong(2));return 1;}).list();return m;}
}
