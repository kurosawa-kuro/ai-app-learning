package com.example.webapptemplate;

import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.ai.AiConnectivity;
import com.example.webapptemplate.ai.internal.adapter.openai.*;
import com.example.webapptemplate.ai.internal.adapter.web.AiController;
import com.example.webapptemplate.ai.internal.application.*;
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

class OpenAITests {
    private OpenAIProperties config() {
        var p=new OpenAIProperties(); p.setApiKey("not-a-real-key"); return p;
    }
    @Test void sendsFixedPromptAndHeaderOnlyAndChecksText() {
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new OpenAIHttpGateway(config(),builder);
        server.expect(requestTo("https://api.openai.com/v1/responses"))
            .andExpect(header("Authorization","Bearer not-a-real-key"))
            .andExpect(jsonPath("$.store").value(false)).andExpect(jsonPath("$.model").value("gpt-4.1-mini")).andExpect(jsonPath("$.input[0].content[0].type").value("input_text")).andExpect(jsonPath("$.max_output_tokens").value(128))
            .andRespond(withSuccess("{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"OK\"}]}]}",MediaType.APPLICATION_JSON));
        assertThat(gateway.probe()).isEqualTo(Status.SUCCESS); server.verify();
    }
    @Test void sendsImageBytesAndReturnsGeneratedText() {
        var builder=RestClient.builder();var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new OpenAIHttpGateway(config(),builder);
        server.expect(anything()).andExpect(content().string(org.hamcrest.Matchers.containsString("input_image")))
            .andExpect(content().string(org.hamcrest.Matchers.containsString("AQID")))
            .andRespond(withSuccess("{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\"draft\"}]}]}",MediaType.APPLICATION_JSON));
        var result=gateway.generate("instruction","input",new com.example.webapptemplate.platform.ImageData(new byte[]{1,2,3},"image/png","png"));
        assertThat(result.text()).isEqualTo("draft");server.verify();
    }
    @ParameterizedTest @CsvSource({"400,REJECTED","401,AUTHENTICATION","403,AUTHENTICATION","404,MODEL_UNAVAILABLE","429,RATE_LIMIT","500,UNAVAILABLE","504,TIMEOUT"})
    void mapsHttpErrorsWithoutExposingBody(int code,Status expected) {
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new OpenAIHttpGateway(config(),builder);
        server.expect(anything()).andRespond(withStatus(HttpStatus.valueOf(code)).body("secret upstream detail"));
        assertThat(gateway.probe()).isEqualTo(expected); server.verify();
    }
    @Test void rejectsEmptyBlockedAndMalformedResponses() {
        for(String body:new String[]{"{}","null","broken json","{\"status\":\"incomplete\",\"output\":[]}","{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"refusal\",\"refusal\":\"No\"}]}]}","{\"status\":\"completed\",\"output\":[{\"type\":\"message\",\"content\":[{\"type\":\"output_text\",\"text\":\" \"}]}]}"}) {
            var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
            var gateway=new OpenAIHttpGateway(config(),builder);
            server.expect(anything()).andRespond(withSuccess(body,MediaType.APPLICATION_JSON));
            assertThat(gateway.probe()).isEqualTo(Status.INVALID_RESPONSE); server.verify();
        }
    }
    @Test void timeoutsAreNotRetried() {
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new OpenAIHttpGateway(config(),builder);
        server.expect(anything()).andRespond(withException(new SocketTimeoutException("private details")));
        assertThat(gateway.probe()).isEqualTo(Status.TIMEOUT); server.verify();
    }
    @Test void invalidApiKeyReportedAsBadRequestIsAuthenticationFailure() {
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        var gateway=new OpenAIHttpGateway(config(),builder);
        server.expect(anything()).andRespond(withStatus(HttpStatus.BAD_REQUEST)
            .body("{\"error\":{\"details\":[{\"reason\":\"API_KEY_INVALID\"}]}}"));
        assertThat(gateway.probe()).isEqualTo(Status.AUTHENTICATION); server.verify();
    }
    @Test void disabledAndMissingKeyNeverCallTheGateway() {
        var gateway=mock(OpenAIGateway.class); var policy=mock(FeaturePolicy.class);
        var service=new CheckOpenAI(gateway,policy);
        assertThat(service.check().status()).isEqualTo(Status.DISABLED);
        when(policy.aiEnabled()).thenReturn(true);
        assertThat(service.check().status()).isEqualTo(Status.UNCONFIGURED);
        verify(gateway,never()).probe();
        var properties=config(); properties.setApiKey("");
        var builder=RestClient.builder(); var server=MockRestServiceServer.bindTo(builder).build();
        assertThat(new OpenAIHttpGateway(properties,builder).probe()).isEqualTo(Status.UNCONFIGURED);
        assertThat(properties.toString()).doesNotContain("not-a-real-key"); server.verify();
    }
    @Test void parallelRequestsDoNotCallOpenAITwice() throws Exception {
        var gateway=mock(OpenAIGateway.class); var policy=mock(FeaturePolicy.class);
        when(policy.aiEnabled()).thenReturn(true); when(gateway.configured()).thenReturn(true);
        when(gateway.model()).thenReturn("gpt-test"); when(policy.allowsAiModel("gpt-test")).thenReturn(true);
        var entered=new CountDownLatch(1); var release=new CountDownLatch(1);
        when(gateway.probe()).thenAnswer(invocation -> { entered.countDown(); release.await(5,TimeUnit.SECONDS); return Status.SUCCESS; });
        var service=new CheckOpenAI(gateway,policy);
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
