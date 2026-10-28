package com.example.webapptemplate;
import com.example.webapptemplate.learning.LearningService;
import com.example.webapptemplate.ai.*;
import com.example.webapptemplate.authors.AuthorOperations;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
@SpringBootTest @Transactional
class LearningTests {
 @Autowired org.springframework.jdbc.core.simple.JdbcClient db;
 @Autowired LearningService service;@Autowired AuthorOperations users;@MockitoBean AiText ai;
 @Test void savesQuestionSnapshotOnceAndNeverStoresFailedAi(){
  var user=users.addAuthor("学習確認");var id=UUID.randomUUID();
  when(ai.generate(any(),anyString(),anyString(),anyList())).thenAnswer(x->new AiDraftResult(x.getArgument(0),"SUCCESS","test","良い回答です。","成功"));
  service.submit(id,user,"QUIZ","past","I walked in the park yesterday.");
  service.submit(id,user,"QUIZ","past","I walked in the park yesterday.");
  verify(ai,times(1)).generate(any(),anyString(),anyString(),anyList());
  assertThat(service.history(user)).hasSize(1);assertThat(service.history(user).get(0).question()).contains("昨日");
  assertThatThrownBy(()->service.submit(id,user,"QUIZ","past","changed")).isInstanceOf(IllegalArgumentException.class);
  when(ai.generate(any(),anyString(),anyString(),anyList())).thenAnswer(x->new AiDraftResult(x.getArgument(0),"RATE_LIMIT","test","","後で再試行"));
  assertThat(service.submit(UUID.randomUUID(),user,"CHAT","","Hello").state()).isEqualTo("RATE_LIMIT");
  assertThat(service.history(user)).hasSize(1);
  assertThat(service.history(users.addAuthor("別の学習者"))).isEmpty();
  assertThatThrownBy(()->users.deleteAuthor(user)).isInstanceOf(IllegalArgumentException.class);
 }
 @Test void snapshotSurvivesQuestionEditAndReplayDoesNotCallAiAgain(){
  var user=users.addAuthor("問題履歴確認");var id=UUID.randomUUID();
  when(ai.generate(any(),anyString(),anyString(),anyList())).thenAnswer(x->new AiDraftResult(x.getArgument(0),"SUCCESS","test","回答結果","成功"));
  service.submit(id,user,"QUIZ","past","I walked yesterday.");
  String answer=db.sql("select reference_answer from learning_entries where id=:id").param("id",id).query(String.class).single();
  db.sql("update learning_questions set prompt='変更した問題',answer='Changed',active=false where id='past'").update();
  assertThat(service.submit(id,user,"QUIZ","past","I walked yesterday.").text()).isEqualTo("回答結果");
  verify(ai,times(1)).generate(any(),anyString(),anyString(),anyList());
  assertThat(answer).isEqualTo("I walked in the park yesterday.");
  assertThat(service.history(user).get(0).question()).contains("昨日");
 }
 @Test void chatContextIsNotLostBehindTwentyQuizzes(){
  var user=users.addAuthor("会話履歴確認");
  db.sql("insert into learning_entries(id,user_id,kind,question,input,feedback,fingerprint,created_at) values(:id,:user,'CHAT','会話','older conversation','Hello there',:hash,now()-interval '1 day')").param("id",UUID.randomUUID()).param("user",user).param("hash","a".repeat(64)).update();
  for(int i=0;i<21;i++)db.sql("insert into learning_entries(id,user_id,kind,question,input,feedback,fingerprint) values(:id,:user,'QUIZ','問題','answer','ok',:hash)").param("id",UUID.randomUUID()).param("user",user).param("hash","b".repeat(64)).update();
  when(ai.generate(any(),anyString(),anyString(),anyList())).thenAnswer(x->new AiDraftResult(x.getArgument(0),"SUCCESS","test","続けましょう","成功"));
  service.submit(UUID.randomUUID(),user,"CHAT","","Hello");
  verify(ai).generate(any(),anyString(),contains("older conversation"),anyList());
 }
}
