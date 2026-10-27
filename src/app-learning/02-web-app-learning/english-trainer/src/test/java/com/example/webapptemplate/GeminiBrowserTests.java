package com.example.webapptemplate;

import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.ai.internal.application.GeminiGateway;
import com.example.webapptemplate.settings.SettingsOperations;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT)
class GeminiBrowserTests {
    @LocalServerPort int port;
    @MockitoBean GeminiGateway gateway;
    @Autowired SettingsOperations settings;
    @Test void browserChecksPermissionSuccessFailureRetryAndCsrfWithoutRealAi() throws Exception {
        boolean originalImages=settings.imagesEnabled(), originalAi=settings.aiEnabled();
        String originalModels=String.join("\n",settings.allowedAiModels());
        try {
            settings.saveFeatures(false,false);
            when(gateway.configured()).thenReturn(true); when(gateway.model()).thenReturn("gemini-test");
            var calls=new AtomicInteger();
            when(gateway.probe()).thenAnswer(invocation -> {
                Thread.sleep(500);
                return calls.incrementAndGet()==1 ? Status.SUCCESS : Status.RATE_LIMIT;
            });
            when(gateway.generate(anyString(),anyString(),any())).thenAnswer(call -> {
                Thread.sleep(300);return new GeminiGateway.Generated(Status.SUCCESS,"AIが作った下書きです。");
            });
            var log=Path.of("target/gemini-browser.log").toFile();
            var process=new ProcessBuilder("node","tests/gemini-connectivity.cjs",Integer.toString(port))
                .redirectErrorStream(true).redirectOutput(log).start();
            boolean finished=process.waitFor(60,TimeUnit.SECONDS);
            if(!finished) process.destroyForcibly();
            assertThat(finished).as("Playwright finished; see target/gemini-browser.log").isTrue();
            assertThat(process.exitValue()).as("Playwright result; see target/gemini-browser.log").isZero();
            assertThat(calls.get()).isEqualTo(2);
            settings.saveFeatures(true,true);
            var draftProcess=new ProcessBuilder("node","tests/ai-draft.cjs",Integer.toString(port))
                .redirectErrorStream(true).redirectOutput(Path.of("target/ai-draft-browser.log").toFile()).start();
            boolean draftFinished=draftProcess.waitFor(60,TimeUnit.SECONDS);
            if(!draftFinished) draftProcess.destroyForcibly();
            assertThat(draftFinished).isTrue();assertThat(draftProcess.exitValue()).as("target/ai-draft-browser.log").isZero();
            verify(gateway,times(1)).generate(anyString(),anyString(),any());
        } finally { settings.saveFeatures(originalImages,originalAi); settings.saveAllowedAiModels(originalModels); }
    }
}
