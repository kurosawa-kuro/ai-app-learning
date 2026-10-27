package com.example.webapptemplate.ai.internal;

import com.example.webapptemplate.ai.AiConnectivity;
import com.example.webapptemplate.ai.internal.application.CheckGemini;
import com.example.webapptemplate.ai.internal.application.GeminiGateway;
import com.example.webapptemplate.ai.internal.adapter.gemini.GeminiHttpGateway;
import com.example.webapptemplate.ai.internal.adapter.gemini.GeminiProperties;
import com.example.webapptemplate.settings.FeaturePolicy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@Configuration
@EnableConfigurationProperties(GeminiProperties.class)
class AiConfiguration {
    @Bean GeminiGateway geminiGateway(GeminiProperties config,@org.springframework.beans.factory.annotation.Value("${app.ai.mode:live}") String mode) {
        return switch(mode) {case "live" -> new GeminiHttpGateway(config);case "demo" -> new com.example.webapptemplate.ai.internal.adapter.gemini.DemoGeminiGateway(config.getModel());default -> throw new IllegalArgumentException("APP_AI_MODE must be live or demo");};
    }
    @Bean com.example.webapptemplate.ai.AiText aiText(GeminiGateway gateway,FeaturePolicy policy,com.example.webapptemplate.platform.ImageCodec codec) {
        return new com.example.webapptemplate.ai.internal.application.GenerateText(gateway,policy,codec);
    }
    @Bean AiConnectivity aiConnectivity(GeminiGateway gateway, FeaturePolicy policy) {
        return new CheckGemini(gateway,policy);
    }
    @Bean com.example.webapptemplate.ai.AiDrafts aiDrafts(GeminiGateway gateway,FeaturePolicy policy,com.example.webapptemplate.platform.ImageCodec codec) {
        return new com.example.webapptemplate.ai.internal.application.GenerateDraft(gateway,policy,codec);
    }
}
