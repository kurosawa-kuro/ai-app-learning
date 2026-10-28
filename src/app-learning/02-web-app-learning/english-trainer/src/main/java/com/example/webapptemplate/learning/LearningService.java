package com.example.webapptemplate.learning;
import com.example.webapptemplate.ai.*;
import com.example.webapptemplate.authors.AuthorOperations;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.simple.JdbcClient;
import java.util.*;
import java.time.OffsetDateTime;
@Service
public class LearningService {
 public record Question(String id,String prompt,String answer){}
 public record Entry(UUID id,UUID userId,String kind,String question,String input,String feedback,OffsetDateTime createdAt){public String createdLabel(){return java.time.format.DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm").withZone(java.time.ZoneId.of("Asia/Tokyo")).format(createdAt);}}
 public record Outcome(String state,String text,String message){}
 private final JdbcClient db;private final AiText ai;private final AuthorOperations users;
 public LearningService(JdbcClient db,AiText ai,AuthorOperations users){this.db=db;this.ai=ai;this.users=users;}
 public List<Question> questions(){return db.sql("select id,prompt,answer from learning_questions where active order by position,id").query(Question.class).list();}
 private List<Entry> recentChat(UUID user){return db.sql("select id,user_id,kind,question,input,feedback,created_at from learning_entries where user_id=:user and kind='CHAT' order by created_at desc,id limit 2").param("user",user).query(Entry.class).list();}
 public record Saved(UUID userId,String kind,String input,String questionId,String feedback){}
 public List<Entry> history(UUID user){if(user==null)return List.of();users.requireAuthor(user);return db.sql("select id,user_id,kind,question,input,feedback,created_at from learning_entries where user_id=:user order by created_at desc,id limit 20").param("user",user).query(Entry.class).list();}
 public Outcome submit(UUID id,UUID user,String kind,String questionId,String input){
  users.requireAuthor(user);if(id==null||input==null||input.isBlank()||input.length()>1000)throw new IllegalArgumentException("英語・メモを1〜1000文字で入力してください。");
  var previous=db.sql("select user_id,kind,input,question_id,feedback from learning_entries where id=:id").param("id",id).query(Saved.class).optional();
  if(previous.isPresent()){
   var saved=previous.get();
   if(!saved.userId().equals(user)||!saved.kind().equals(kind)||!saved.input().equals(input)||(saved.questionId()!=null&&!saved.questionId().equals(questionId)))throw new IllegalArgumentException("送信済みの内容が変わっています。画面を読み直してください。");
   return new Outcome("SUCCESS",saved.feedback(),"保存済みの結果です。");
  }
  String question,instruction,material;String referenceAnswer=null;String selectedQuestion=null;
  switch(kind){
   case "QUIZ" -> {var q=questions().stream().filter(x->x.id().equals(questionId)).findFirst().orElseThrow(()->new IllegalArgumentException("問題を選び直してください。"));question=q.prompt();referenceAnswer=q.answer();selectedQuestion=q.id();instruction="ENGLISH_GRADE: 英語入門者の回答を日本語で短く採点。正しい点・改善点・自然な一例を示す。同じ意味の別表現も認める。";material="問題："+question+"\n参考回答："+q.answer()+"\n本人の回答："+input;}
   case "CHAT" -> {question="英語でひとこと会話";instruction="ENGLISH_CHAT: 英語入門者と短い英語で会話。やさしい一文で応答し、一つだけ質問する。";material=input;for(var h:recentChat(user))material+="\n前の会話："+h.input()+" / "+h.feedback().substring(0,Math.min(500,h.feedback().length()));}
   case "REFLECT" -> {question="今日の振り返り";instruction="ENGLISH_REFLECT: 学習履歴と本人のメモから、できたことと次に試す一文を日本語で短く提案する。";material="本人のメモ："+input;for(var h:history(user).stream().limit(3).toList())material+="\n過去の回答："+h.input();}
   default -> throw new IllegalArgumentException("学習方法を選択してください。");
  }
  String fingerprint=hash(List.of(user.toString(),kind,question,input,referenceAnswer==null?"":referenceAnswer));
  var result=ai.generate(id,instruction,material,List.of());if(!result.state().equals("SUCCESS"))return new Outcome(result.state(),"",result.message());
  db.sql("insert into learning_entries(id,user_id,kind,question,input,feedback,fingerprint,question_id,reference_answer) values(:id,:user,:kind,:question,:input,:feedback,:hash,:questionId,:reference) on conflict(id) do nothing").param("id",id).param("user",user).param("kind",kind).param("question",question).param("input",input).param("feedback",result.text()).param("hash",fingerprint).param("questionId",selectedQuestion).param("reference",referenceAnswer).update();
  var saved=db.sql("select fingerprint from learning_entries where id=:id").param("id",id).query(String.class).single();if(!saved.equals(fingerprint))throw new IllegalArgumentException("同じ要求で異なる回答を保存できません。");
  return new Outcome("SUCCESS",db.sql("select feedback from learning_entries where id=:id").param("id",id).query(String.class).single(),"結果を学習履歴に保存しました。");
 }
 private String hash(List<String> fields){try{var d=java.security.MessageDigest.getInstance("SHA-256");for(var f:fields){var b=f.getBytes(java.nio.charset.StandardCharsets.UTF_8);d.update(java.nio.ByteBuffer.allocate(4).putInt(b.length).array());d.update(b);}return HexFormat.of().formatHex(d.digest());}catch(java.security.NoSuchAlgorithmException e){throw new IllegalStateException(e);}}
}
