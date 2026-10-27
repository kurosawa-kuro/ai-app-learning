package com.example.webapptemplate;
import com.example.webapptemplate.ai.*;
import com.example.webapptemplate.ai.internal.application.*;
import com.example.webapptemplate.ai.internal.adapter.persistence.JdbcDraftStore;
import com.example.webapptemplate.platform.*;
import com.example.webapptemplate.platform.internal.adapter.image.ImageIoCodec;
import com.example.webapptemplate.settings.FeaturePolicy;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
@SpringBootTest
class DraftTests {
 @Autowired JdbcTemplate jdbc;
 GeminiGateway gateway; FeaturePolicy policy; GenerateDraft drafts; JdbcDraftStore store;
 final String owner=UUID.randomUUID().toString();
 @BeforeEach void setup() {
  gateway=mock(GeminiGateway.class);policy=mock(FeaturePolicy.class,CALLS_REAL_METHODS);
  when(gateway.configured()).thenReturn(true);when(gateway.model()).thenReturn("gemini-test");
  when(policy.aiEnabled()).thenReturn(true);when(policy.imagesEnabled()).thenReturn(true);when(policy.allowsAiModel("gemini-test")).thenReturn(true);
  store=new JdbcDraftStore(jdbc);drafts=new GenerateDraft(gateway,store,policy,new ImageIoCodec(),AuditTrail.NONE);
 }
 @AfterEach void cleanup() { jdbc.update("delete from ai_requests where owner_id=?",owner); }
 @Test void durableSuccessReplayAndChangedInputAndOwnerIsolation() {
  var id=UUID.randomUUID();when(gateway.generate(anyString(),anyString(),isNull())).thenReturn(new GeminiGateway.Generated(AiCheckResult.Status.SUCCESS,"下書き"));
  assertThat(drafts.generate(id,owner,"素材",null).text()).isEqualTo("下書き");
  var restarted=new GenerateDraft(gateway,new JdbcDraftStore(jdbc),policy,new ImageIoCodec(),AuditTrail.NONE);
  assertThat(restarted.generate(id,owner,"素材",null).state()).isEqualTo("SUCCESS");
  assertThatThrownBy(()->drafts.generate(id,owner,"変更",null)).isInstanceOf(IllegalArgumentException.class);
  assertThatThrownBy(()->drafts.find(id,"another-browser")).isInstanceOf(IllegalArgumentException.class);
  verify(gateway,times(1)).generate(anyString(),anyString(),isNull());
 }
 @Test void concurrentDuplicateDoesNotGenerateAgain() throws Exception {
  var started=new CountDownLatch(1);var release=new CountDownLatch(1);var id=UUID.randomUUID();
  when(gateway.generate(anyString(),anyString(),isNull())).thenAnswer(call->{started.countDown();release.await(5,TimeUnit.SECONDS);return new GeminiGateway.Generated(AiCheckResult.Status.SUCCESS,"結果");});
  var executor=Executors.newSingleThreadExecutor();
  try {
   var first=executor.submit(()->drafts.generate(id,owner,"素材",null));assertThat(started.await(5,TimeUnit.SECONDS)).isTrue();
   assertThat(drafts.generate(id,owner,"素材",null).state()).isEqualTo("RUNNING");release.countDown();assertThat(first.get(5,TimeUnit.SECONDS).state()).isEqualTo("SUCCESS");
   verify(gateway,times(1)).generate(anyString(),anyString(),isNull());
  } finally {release.countDown();executor.shutdownNow();}
 }
 @Test void timeoutAndStaleAndExpiredNeverAutoRetry() {
  var id=UUID.randomUUID();when(gateway.generate(anyString(),anyString(),isNull())).thenReturn(new GeminiGateway.Generated(AiCheckResult.Status.TIMEOUT,""));
  assertThat(drafts.generate(id,owner,"素材",null).state()).isEqualTo("UNKNOWN");
  assertThat(drafts.generate(id,owner,"素材",null).state()).isEqualTo("UNKNOWN");
  jdbc.update("update ai_requests set state='RUNNING',created_at=now()-interval '3 minutes' where request_id=?",id);
  assertThat(drafts.find(id,owner).state()).isEqualTo("UNKNOWN");
  jdbc.update("update ai_requests set state='SUCCESS',result_text='expired',created_at=now()-interval '8 days' where request_id=?",id);
  assertThat(drafts.find(id,owner).state()).isEqualTo("EXPIRED");assertThat(drafts.find(id,owner).text()).isEmpty();
  verify(gateway,times(1)).generate(anyString(),anyString(),isNull());
 }
 @Test void deniedMissingKeyAndInvalidImageNeverCallProvider() {
  when(policy.aiEnabled()).thenReturn(false);assertThat(drafts.generate(UUID.randomUUID(),owner,"素材",null).state()).isEqualTo("DISABLED");
  when(policy.aiEnabled()).thenReturn(true);when(gateway.configured()).thenReturn(false);assertThat(drafts.generate(UUID.randomUUID(),owner,"素材",null).state()).isEqualTo("UNCONFIGURED");
  when(gateway.configured()).thenReturn(true);when(policy.allowsAiModel("gemini-test")).thenReturn(false);assertThat(drafts.generate(UUID.randomUUID(),owner,"素材",null).state()).isEqualTo("MODEL_DENIED");
  when(policy.allowsAiModel("gemini-test")).thenReturn(true);
  assertThatThrownBy(()->drafts.generate(UUID.randomUUID(),owner,"素材",new ImageUpload(new byte[]{1,2}))).isInstanceOf(IllegalArgumentException.class);
  verify(gateway,never()).generate(anyString(),anyString(),any());
 }
 @Test void validImageIsActuallyPassedAndDisabledImagesAreRejected() {
  var image=new ImageUpload(Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDa0AAAAASUVORK5CYII="));
  when(gateway.generate(anyString(),anyString(),any())).thenReturn(new GeminiGateway.Generated(AiCheckResult.Status.SUCCESS,"写真の下書き"));
  assertThat(drafts.generate(UUID.randomUUID(),owner,"写真",image).state()).isEqualTo("SUCCESS");
  verify(gateway).generate(anyString(),eq("写真"),argThat(value->value.type().equals("image/png") && value.bytes().length>0));
  when(policy.imagesEnabled()).thenReturn(false);assertThatThrownBy(()->drafts.generate(UUID.randomUUID(),owner,"写真",image)).isInstanceOf(IllegalArgumentException.class);
 }
 @Test void raceBetweenLookupAndInsertReturnsExistingState() {
  var racing=mock(DraftStore.class);var id=UUID.randomUUID();
  when(racing.matches(eq(id),eq(owner),anyString())).thenReturn(false,true);
  when(racing.claim(eq(id),eq(owner),anyString(),anyString(),anyString())).thenReturn(false);
  when(racing.find(id,owner)).thenReturn(new AiDraftResult(id,"RUNNING","gemini-test","","生成中"));
  var service=new GenerateDraft(gateway,racing,policy,new ImageIoCodec(),AuditTrail.NONE);
  assertThat(service.generate(id,owner,"素材",null).state()).isEqualTo("RUNNING");
  verify(gateway,never()).generate(anyString(),anyString(),any());
 }
}
