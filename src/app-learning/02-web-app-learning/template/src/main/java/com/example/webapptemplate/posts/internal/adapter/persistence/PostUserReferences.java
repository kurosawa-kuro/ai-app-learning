package com.example.webapptemplate.posts.internal.adapter.persistence;
import com.example.webapptemplate.platform.UserReferences;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
@Repository
public class PostUserReferences implements UserReferences {
 private final JdbcTemplate jdbc;
 public PostUserReferences(JdbcTemplate jdbc) { this.jdbc=jdbc; }
 public Map<UUID,Long> counts() {
  var counts=new HashMap<UUID,Long>();
  jdbc.query("select user_id,count(*) as total from posts group by user_id",rs -> { counts.put(rs.getObject("user_id",UUID.class),rs.getLong("total")); });
  return counts;
 }
}
