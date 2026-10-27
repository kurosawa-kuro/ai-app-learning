package com.example.webapptemplate;

import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.ai.AiConnectivity;
import com.example.webapptemplate.ai.internal.adapter.gemini.*;
import com.example.webapptemplate.ai.internal.adapter.web.AiController;
import com.example.webapptemplate.ai.internal.application.*;
import com.example.webapptemplate.platform.AuditTrail;
import com.example.webapptemplate.settings.FeaturePolicy;
import java.net.SocketTimeoutException;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.ui.ExtendedModelMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.servlet.mvc.support.RedirectAttributesModelMap;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.*;

class GeminiTests {
    private GeminiProperties config() {
        var p=new GeminiProperties(); p.setApiKey("not-a-real-key"); return p;
    }
    @Test void sendsFixedPromptAndHeaderOnlyAndChecksText() {
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new GeminiHttpGateway(config(),builder);
        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent"))
            .andExpect(header("x-goog-api-key","not-a-real-key"))
            .andExpect(content().json("{\"contents\":[{\"role\":\"user\",\"parts\":[{\"text\":\"Reply with only OK. This is a connection test.\"}]}],\"generationConfig\":{\"maxOutputTokens\":128}}"))
            .andRespond(withSuccess("{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"OK\"}]}}]}",MediaType.APPLICATION_JSON));
        assertThat(gateway.probe()).isEqualTo(Status.SUCCESS); server.verify();
    }
    @Test void sendsImageBytesAndReturnsGeneratedText() {
        var builder=RestClient.builder();var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new GeminiHttpGateway(config(),builder);
        server.expect(anything()).andExpect(content().string(org.hamcrest.Matchers.containsString("inline_data")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("AQID")))
            .andRespond(withSuccess("{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\"draft\"}]}}]}",MediaType.APPLICATION_JSON));
        var result=gateway.generate("instruction","input",new com.example.webapptemplate.platform.ImageData(new byte[]{1,2,3},"image/png","png"));
        assertThat(result.text()).isEqualTo("draft");server.verify();
    }
    @ParameterizedTest @CsvSource({"400,REJECTED","401,AUTHENTICATION","403,AUTHENTICATION","404,MODEL_UNAVAILABLE","429,RATE_LIMIT","500,UNAVAILABLE","504,TIMEOUT"})
    void mapsHttpErrorsWithoutExposingBody(int code,Status expected) {
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new GeminiHttpGateway(config(),builder);
        server.expect(anything()).andRespond(withStatus(HttpStatus.valueOf(code)).body("secret upstream detail"));
        assertThat(gateway.probe()).isEqualTo(expected); server.verify();
    }
    @Test void rejectsEmptyBlockedAndMalformedResponses() {
        for(String body:new String[]{"{}","null","broken json","{\"candidates\":[{\"finishReason\":\"SAFETY\"}]}","{\"candidates\":[{\"finishReason\":\"STOP\",\"content\":{\"parts\":[{\"text\":\" \"}]}}]}"}) {
            var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
            var gateway=new GeminiHttpGateway(config(),builder);
            server.expect(anything()).andRespond(withSuccess(body,MediaType.APPLICATION_JSON));
            assertThat(gateway.probe()).isEqualTo(Status.INVALID_RESPONSE); server.verify();
        }
    }
    @Test void timeoutsAreNotRetried() {
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new GeminiHttpGateway(config(),builder);
        server.expect(anything()).andRespond(withException(new SocketTimeoutException("private details")));
        assertThat(gateway.probe()).isEqualTo(Status.TIMEOUT); server.verify();
    }
    @Test void invalidApiKeyReportedAsBadRequestIsAuthenticationFailure() {
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new GeminiHttpGateway(config(),builder);
        server.expect(anything()).andRespond(withStatus(HttpStatus.BAD_REQUEST)
            .body("{\"error\":{\"details\":[{\"reason\":\"API_KEY_INVALID\"}]}}"));
        assertThat(gateway.probe()).isEqualTo(Status.AUTHENTICATION); server.verify();
    }
    @Test void disabledAndMissingKeyNeverCallTheGateway() {
        var gateway=mock(GeminiGateway.class); var policy=mock(FeaturePolicy.class);
        var audit=mock(AuditTrail.class); var service=new CheckGemini(gateway,policy,audit);
        assertThat(service.check().status()).isEqualTo(Status.DISABLED);
        when(policy.aiEnabled()).thenReturn(true);
        assertThat(service.check().status()).isEqualTo(Status.UNCONFIGURED);
        verify(gateway,never()).probe();
        var properties=config(); properties.setApiKey("");
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        assertThat(new GeminiHttpGateway(properties,builder).probe()).isEqualTo(Status.UNCONFIGURED);
        assertThat(properties.toString()).doesNotContain("not-a-real-key"); server.verify();
    }
    @Test void parallelRequestsDoNotCallGeminiTwice() throws Exception {
        var gateway=mock(GeminiGateway.class); var policy=mock(FeaturePolicy.class);
        when(policy.aiEnabled()).thenReturn(true); when(gateway.configured()).thenReturn(true);
        when(gateway.model()).thenReturn("gemini-test"); when(policy.allowsAiModel("gemini-test")).thenReturn(true);
        var entered=new CountDownLatch(1); var release=new CountDownLatch(1);
        when(gateway.probe()).thenAnswer(invocation -> { entered.countDown(); release.await(5,TimeUnit.SECONDS); return Status.SUCCESS; });
        var service=new CheckGemini(gateway,policy,AuditTrail.NONE);
        var executor=Executors.newSingleThreadExecutor();
        try {
            var first=executor.submit(service::check); assertThat(entered.await(5,TimeUnit.SECONDS)).isTrue();
            assertThat(service.check().status()).isEqualTo(Status.BUSY);
            release.countDown(); assertThat(first.get(5,TimeUnit.SECONDS).status()).isEqualTo(Status.SUCCESS);
            verify(gateway,times(1)).probe();
        } finally { release.countDown(); executor.shutdownNow(); }
    }
    @Test void reusedOrMissingBrowserTokenDoesNotExecuteAgain() {
        var ai=mock(AiConnectivity.class); var controller=new AiController(ai,mock(com.example.webapptemplate.settings.SettingsOperations.class));
        var session=new MockHttpSession(); var model=new ExtendedModelMap();
        controller.show(model,session);
        String token=(String)model.get("requestToken");
        controller.check(token,session,new RedirectAttributesModelMap());
        var flash=new RedirectAttributesModelMap();
        controller.check(token,session,flash);
        controller.check("",session,new RedirectAttributesModelMap());
        verify(ai,times(1)).check();
        assertThat(flash.getFlashAttributes()).containsKey("error");
    }
}
