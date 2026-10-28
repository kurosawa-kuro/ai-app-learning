package com.example.webapptemplate;
import com.example.webapptemplate.janken.JankenService;import com.example.webapptemplate.janken.internal.domain.RoundRules;import com.example.webapptemplate.authors.AuthorOperations;import com.example.webapptemplate.ai.AiText;import java.util.*;import org.junit.jupiter.api.Test;import org.springframework.beans.factory.annotation.Autowired;import org.springframework.boot.test.context.SpringBootTest;import org.springframework.test.context.bean.override.mockito.MockitoBean;import org.springframework.transaction.annotation.Transactional;import static org.assertj.core.api.Assertions.*;import static org.mockito.Mockito.*;
@SpringBootTest @Transactional class JankenTests {
 @Autowired JankenService game;@Autowired AuthorOperations users;@MockitoBean AiText ai;
 @Test void battleUsesSavedLineWithoutAiAndRetryDoesNotAddPoints(){var user=users.addAuthor("対戦確認");game.adopt(user,"hinoko","もう一度、挑戦しよう！");var id=UUID.randomUUID();var first=game.play(id,user,"hinoko","rock","win");assertThat(game.play(id,user,"hinoko","rock","win")).isEqualTo(first);assertThat(game.history(user)).hasSize(1);assertThat(game.total(user)).isEqualTo(first.points());assertThat(first.line()).isEqualTo("もう一度、挑戦しよう！");game.adopt(user,"hinoko","別のセリフ");assertThat(game.history(user).get(0).line()).isEqualTo(first.line());verifyNoInteractions(ai);assertThatThrownBy(()->game.play(id,user,"hinoko","paper","win")).isInstanceOf(IllegalArgumentException.class);assertThatThrownBy(()->game.play(UUID.randomUUID(),user,"hinoko","rock","draw")).isInstanceOf(IllegalArgumentException.class);}
 @Test void skillChangesPointsButNeverTheWinner(){for(var hand:List.of("rock","scissors","paper"))for(var cpu:List.of("rock","scissors","paper")){String outcome=RoundRules.resolve(hand,cpu,"win").outcome();for(var skill:List.of("win","lose","draw")){var r=RoundRules.resolve(hand,cpu,skill);assertThat(r.outcome()).isEqualTo(outcome);assertThat(r.points()).isEqualTo((outcome.equals("win")?2:1)+(outcome.equals(skill)?1:0));}}assertThat(RoundRules.resolve("rock","scissors","win").points()).isEqualTo(3);}
 @Test void skillsAreRequiredAndRestrictedByCharacter(){
  assertThatThrownBy(()->RoundRules.validate("hinoko","rock","draw")).isInstanceOf(IllegalArgumentException.class);
  RoundRules.validate("hinoko","rock","win");
  assertThat(RoundRules.resolve("rock","scissors","win").points()).isEqualTo(3);
  assertThat(RoundRules.resolve("rock","scissors","lose").points()).isEqualTo(2);
  assertThat(RoundRules.resolve("rock","paper","lose").points()).isEqualTo(2);
  assertThat(RoundRules.resolve("rock","rock","draw").points()).isEqualTo(2);
 }
}
