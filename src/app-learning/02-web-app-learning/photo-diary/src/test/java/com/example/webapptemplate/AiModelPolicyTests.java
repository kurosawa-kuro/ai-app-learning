package com.example.webapptemplate;

import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.ai.internal.application.*;
import com.example.webapptemplate.settings.FeaturePolicy;
import com.example.webapptemplate.settings.SettingsOperations;
import com.example.webapptemplate.settings.internal.domain.AllowedAiModels;
import com.example.webapptemplate.settings.internal.adapter.persistence.JdbcSettingsStore;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@SpringBootTest
@Transactional
class AiModelPolicyTests {
    @Autowired SettingsOperations settings;
    @Autowired JdbcTemplate jdbc;
    @Test void persistedExactAllowListSurvivesReconstructionAndFeatureToggles() {
        settings.saveAllowedAiModels("gpt-test\r\ngpt-test\n gpt-other ");
        assertThat(new JdbcSettingsStore(jdbc,false).allowedAiModels()).isEqualTo("gpt-test\ngpt-other");
        assertThat(settings.allowsAiModel("gpt-test")).isTrue();
        assertThat(settings.allowsAiModel("gpt-test-pro")).isFalse();
        settings.saveFeatures(false,true);
        assertThat(settings.allowedAiModels()).containsExactly("gpt-test","gpt-other");
        settings.saveAllowedAiModels("");
        assertThat(settings.aiEnabled()).isTrue();
        assertThat(settings.allowsAiModel("gpt-test")).isFalse();
    }
    @Test void invalidInputsDoNotOverwriteSavedPolicy() {
        settings.saveAllowedAiModels("gpt-test");
        for(String input:new String[]{"*","openai-*","https://example.com","gpt-test another","x".repeat(2001)}) {
            assertThatThrownBy(()->settings.saveAllowedAiModels(input)).isInstanceOf(IllegalArgumentException.class);
            assertThat(settings.allowedAiModels()).containsExactly("gpt-test");
        }
        String many=java.util.stream.IntStream.range(0,21).mapToObj(i->"gpt-test-"+i).collect(java.util.stream.Collectors.joining("\n"));
        assertThatThrownBy(()->AllowedAiModels.parse(many)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void directCallsAndPolicyChangedAfterPageLoadCannotBypassRestriction() {
        var gateway=mock(OpenAIGateway.class);
        when(gateway.configured()).thenReturn(true); when(gateway.model()).thenReturn("gpt-test");
        settings.saveFeatures(false,true); settings.saveAllowedAiModels("");
        assertThat(new CheckOpenAI(gateway,settings).check().status()).isEqualTo(Status.MODEL_DENIED);
        var policy=mock(FeaturePolicy.class); when(policy.aiEnabled()).thenReturn(true);
        when(policy.allowsAiModel("gpt-test")).thenReturn(true,false);
        assertThat(new CheckOpenAI(gateway,policy).check().status()).isEqualTo(Status.MODEL_DENIED);
        verify(gateway,never()).probe();
    }
}
