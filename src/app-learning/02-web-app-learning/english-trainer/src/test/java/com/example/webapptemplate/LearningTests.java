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
}
