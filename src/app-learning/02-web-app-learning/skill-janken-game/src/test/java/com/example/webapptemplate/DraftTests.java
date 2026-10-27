package com.example.webapptemplate;
import com.example.webapptemplate.ai.*;
import com.example.webapptemplate.ai.internal.application.*;
import com.example.webapptemplate.ai.internal.adapter.web.DraftController;
import com.example.webapptemplate.platform.*;
import com.example.webapptemplate.platform.internal.adapter.image.ImageIoCodec;
import com.example.webapptemplate.settings.FeaturePolicy;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockHttpSession;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
class DraftTests {
 GeminiGateway gateway;FeaturePolicy policy;GenerateDraft drafts;
 @BeforeEach void setup() {
  gateway=mock(GeminiGateway.class);policy=mock(FeaturePolicy.class,CALLS_REAL_METHODS);
  when(gateway.configured()).thenReturn(true);when(gateway.model()).thenReturn("gemini-test");
  when(policy.aiEnabled()).thenReturn(true);when(policy.imagesEnabled()).thenReturn(true);when(policy.allowsAiModel("gemini-test")).thenReturn(true);
  drafts=new GenerateDraft(gateway,policy,new ImageIoCodec());
 }
 @Test void onlyLastResultIsKeptInTheSameBrowserWithoutDatabase() {
  when(gateway.generate(anyString(),anyString(),isNull())).thenReturn(new GeminiGateway.Generated(AiCheckResult.Status.SUCCESS,"draft"));
  var controller=new DraftController(drafts);var session=new MockHttpSession();var id=UUID.randomUUID();
  assertThat(((AiDraftResult)controller.generate(id,"input",null,session).getBody()).text()).isEqualTo("draft");
  controller.generate(id,"input",null,session);
  verify(gateway,times(1)).generate(anyString(),anyString(),isNull());
  assertThat(controller.find(id,new MockHttpSession()).getStatusCode().value()).isEqualTo(404);
  controller.generate(UUID.randomUUID(),"next",null,session);
  assertThat(controller.find(id,session).getStatusCode().value()).isEqualTo(404);
  assertThat(Collections.list(session.getAttributeNames())).hasSize(1);
 }
 @Test void parallelRequestFromSameBrowserDoesNotCallProviderTwice() throws Exception {
  var started=new CountDownLatch(1);var release=new CountDownLatch(1);
  when(gateway.generate(anyString(),anyString(),isNull())).thenAnswer(c->{started.countDown();release.await(5,TimeUnit.SECONDS);return new GeminiGateway.Generated(AiCheckResult.Status.SUCCESS,"draft");});
  var controller=new DraftController(drafts);var session=new MockHttpSession();var id=UUID.randomUUID();var executor=Executors.newSingleThreadExecutor();
  try {
   var first=executor.submit(()->controller.generate(id,"input",null,session));assertThat(started.await(5,TimeUnit.SECONDS)).isTrue();
   assertThat(((AiDraftResult)controller.generate(id,"input",null,session).getBody()).state()).isEqualTo("RUNNING");
   assertThat(controller.generate(UUID.randomUUID(),"other",null,session).getStatusCode().value()).isEqualTo(409);
   release.countDown();assertThat(first.get(5,TimeUnit.SECONDS).getStatusCode().value()).isEqualTo(200);
   verify(gateway,times(1)).generate(anyString(),anyString(),isNull());
  } finally {release.countDown();executor.shutdownNow();}
 }
 @Test void timeoutDoesNotAutomaticallyRetry() {
  when(gateway.generate(anyString(),anyString(),isNull())).thenReturn(new GeminiGateway.Generated(AiCheckResult.Status.TIMEOUT,""));
  var controller=new DraftController(drafts);var session=new MockHttpSession();var id=UUID.randomUUID();
  assertThat(((AiDraftResult)controller.generate(id,"input",null,session).getBody()).state()).isEqualTo("TIMEOUT");
  controller.generate(id,"input",null,session);verify(gateway,times(1)).generate(anyString(),anyString(),isNull());
 }
 @Test void deniedMissingKeyAndInvalidImageNeverCallProvider() {
  when(policy.aiEnabled()).thenReturn(false);assertThat(drafts.generate(UUID.randomUUID(),"素材",null).state()).isEqualTo("DISABLED");
  when(policy.aiEnabled()).thenReturn(true);when(gateway.configured()).thenReturn(false);assertThat(drafts.generate(UUID.randomUUID(),"素材",null).state()).isEqualTo("UNCONFIGURED");
  when(gateway.configured()).thenReturn(true);when(policy.allowsAiModel("gemini-test")).thenReturn(false);assertThat(drafts.generate(UUID.randomUUID(),"素材",null).state()).isEqualTo("MODEL_DENIED");
  when(policy.allowsAiModel("gemini-test")).thenReturn(true);
  assertThatThrownBy(()->drafts.generate(UUID.randomUUID(),"素材",new ImageUpload(new byte[]{1,2}))).isInstanceOf(IllegalArgumentException.class);
  verify(gateway,never()).generate(anyString(),anyString(),any());
 }
 @Test void validImageIsActuallyPassedAndDisabledImagesAreRejected() {
  var image=new ImageUpload(Base64.getDecoder().decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aDa0AAAAASUVORK5CYII="));
  when(gateway.generate(anyString(),anyString(),any())).thenReturn(new GeminiGateway.Generated(AiCheckResult.Status.SUCCESS,"写真の下書き"));
  assertThat(drafts.generate(UUID.randomUUID(),"写真",image).state()).isEqualTo("SUCCESS");
  verify(gateway).generate(anyString(),eq("写真"),argThat(value->value.type().equals("image/png") && value.bytes().length>0));
  when(policy.imagesEnabled()).thenReturn(false);assertThatThrownBy(()->drafts.generate(UUID.randomUUID(),"写真",image)).isInstanceOf(IllegalArgumentException.class);
 }
}
