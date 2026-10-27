package com.example.webapptemplate.ai.internal;

import com.example.webapptemplate.ai.AiConnectivity;
import com.example.webapptemplate.ai.internal.application.CheckGemini;
import com.example.webapptemplate.ai.internal.application.GeminiGateway;
import com.example.webapptemplate.ai.internal.adapter.gemini.GeminiHttpGateway;
import com.example.webapptemplate.ai.internal.adapter.gemini.GeminiProperties;
import com.example.webapptemplate.platform.AuditTrail;
import com.example.webapptemplate.settings.FeaturePolicy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@Configuration
@org.springframework.scheduling.annotation.EnableScheduling
@EnableConfigurationProperties(GeminiProperties.class)
class AiConfiguration {
    @Bean GeminiGateway geminiGateway(GeminiProperties config) { return new GeminiHttpGateway(config); }
    @Bean AiConnectivity aiConnectivity(GeminiGateway gateway, FeaturePolicy policy, AuditTrail audit) {
        return new CheckGemini(gateway,policy,audit);
    }
    @Bean com.example.webapptemplate.ai.AiDrafts aiDrafts(GeminiGateway gateway,com.example.webapptemplate.ai.internal.application.DraftStore store,FeaturePolicy policy,com.example.webapptemplate.platform.ImageCodec codec,AuditTrail audit) {
        return new com.example.webapptemplate.ai.internal.application.GenerateDraft(gateway,store,policy,codec,audit);
    }
}
