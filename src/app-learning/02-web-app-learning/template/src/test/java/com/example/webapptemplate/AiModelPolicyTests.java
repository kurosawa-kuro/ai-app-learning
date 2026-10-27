package com.example.webapptemplate;

import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.ai.internal.application.*;
import com.example.webapptemplate.platform.AuditTrail;
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
        settings.saveAllowedAiModels("gemini-test\r\ngemini-test\n gemini-other ");
        assertThat(new JdbcSettingsStore(jdbc,false).allowedAiModels()).isEqualTo("gemini-test\ngemini-other");
        assertThat(settings.allowsAiModel("gemini-test")).isTrue();
        assertThat(settings.allowsAiModel("gemini-test-pro")).isFalse();
        settings.saveFeatures(false,true);
        assertThat(settings.allowedAiModels()).containsExactly("gemini-test","gemini-other");
        settings.saveAllowedAiModels("");
        assertThat(settings.aiEnabled()).isTrue();
        assertThat(settings.allowsAiModel("gemini-test")).isFalse();
    }
    @Test void invalidInputsDoNotOverwriteSavedPolicy() {
        settings.saveAllowedAiModels("gemini-test");
        for(String input:new String[]{"*","gemini-*","https://example.com","gemini-test another","x".repeat(2001)}) {
            assertThatThrownBy(()->settings.saveAllowedAiModels(input)).isInstanceOf(IllegalArgumentException.class);
            assertThat(settings.allowedAiModels()).containsExactly("gemini-test");
        }
        String many=java.util.stream.IntStream.range(0,21).mapToObj(i->"gemini-test-"+i).collect(java.util.stream.Collectors.joining("\n"));
        assertThatThrownBy(()->AllowedAiModels.parse(many)).isInstanceOf(IllegalArgumentException.class);
    }
    @Test void directCallsAndPolicyChangedAfterPageLoadCannotBypassRestriction() {
        var gateway=mock(GeminiGateway.class);
        when(gateway.configured()).thenReturn(true); when(gateway.model()).thenReturn("gemini-test");
        settings.saveFeatures(false,true); settings.saveAllowedAiModels("");
        assertThat(new CheckGemini(gateway,settings,AuditTrail.NONE).check().status()).isEqualTo(Status.MODEL_DENIED);
        var policy=mock(FeaturePolicy.class); when(policy.aiEnabled()).thenReturn(true);
        when(policy.allowsAiModel("gemini-test")).thenReturn(true,false);
        assertThat(new CheckGemini(gateway,policy,AuditTrail.NONE).check().status()).isEqualTo(Status.MODEL_DENIED);
        verify(gateway,never()).probe();
    }
}
