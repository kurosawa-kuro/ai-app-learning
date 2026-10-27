package com.example.webapptemplate.janken;
import com.example.webapptemplate.janken.internal.domain.RoundRules;
import com.example.webapptemplate.authors.AuthorOperations;import com.example.webapptemplate.ai.*;import com.example.webapptemplate.platform.UnitOfWork;import org.springframework.jdbc.core.simple.JdbcClient;import org.springframework.stereotype.Service;import java.util.*;import java.time.OffsetDateTime;
@Service public class JankenService {
 public record Round(UUID id,UUID userId,String character,String skill,String hand,String cpu,String outcome,int points,String line,OffsetDateTime createdAt){}
 private final JdbcClient db;private final UnitOfWork tx;private final AuthorOperations users;private final AiText ai;private final java.security.SecureRandom random=new java.security.SecureRandom();
 public JankenService(JdbcClient db,UnitOfWork tx,AuthorOperations users,AiText ai){this.db=db;this.tx=tx;this.users=users;this.ai=ai;}
 public List<Round> history(UUID user){return user==null?List.of():db.sql("select * from janken_rounds where user_id=:user order by created_at desc,id limit 20").param("user",user).query(Round.class).list();}
 public long total(UUID user){return user==null?0:db.sql("select coalesce(sum(points),0) from janken_rounds where user_id=:user").param("user",user).query(Long.class).single();}
 public Round play(UUID id,UUID user,String character,String hand,String skill){RoundRules.validate(character,hand,skill);users.requireAuthor(user);return tx.execute(()->{
  db.sql("select pg_advisory_xact_lock(hashtextextended(:id,0))").param("id",id.toString()).query((r,n)->1).single();
  var old=db.sql("select * from janken_rounds where id=:id").param("id",id).query(Round.class).optional();if(old.isPresent()){var r=old.get();if(!r.userId().equals(user)||!r.character().equals(character)||!r.hand().equals(hand)||!r.skill().equals(skill))throw new IllegalArgumentException("送信済みの対戦です。次の対戦へ進んでください。");return r;}
  String cpu=List.of("rock","scissors","paper").get(random.nextInt(3));var score=RoundRules.resolve(hand,cpu,skill);
  String line=db.sql("select line from janken_lines where user_id=:user and character=:character").param("user",user).param("character",character).query(String.class).optional().orElse("次の一手も、いっしょに楽しもう！");
  db.sql("insert into janken_rounds(id,user_id,character,skill,hand,cpu,outcome,points,line) values(:id,:user,:character,:skill,:hand,:cpu,:outcome,:points,:line)").param("id",id).param("user",user).param("character",character).param("skill",skill).param("hand",hand).param("cpu",cpu).param("outcome",score.outcome()).param("points",score.points()).param("line",line).update();return db.sql("select * from janken_rounds where id=:id").param("id",id).query(Round.class).single();
 });}
 public AiDraftResult draft(UUID id,String character,String material){if(!RoundRules.AFFINITIES.containsKey(character))throw new IllegalArgumentException("なかまを選んでください。");return ai.generate(id,"JANKEN_LINE: 子ども向けじゃんけんの仲間の応援セリフを、日本語で一文、60文字以内。勝敗を決めず、相手を傷つけない。セリフだけ返す。",character+"："+material,List.of());}
 public void adopt(UUID user,String character,String line){users.requireAuthor(user);if(!RoundRules.AFFINITIES.containsKey(character)||line==null||line.isBlank()||line.length()>120)throw new IllegalArgumentException("セリフは1〜120文字です。");db.sql("insert into janken_lines values(:user,:character,:line) on conflict(user_id,character) do update set line=excluded.line").param("user",user).param("character",character).param("line",line.strip()).update();}
}
