package com.example.webapptemplate.ai.internal;

import com.example.webapptemplate.ai.AiConnectivity;
import com.example.webapptemplate.ai.internal.application.CheckOpenAI;
import com.example.webapptemplate.ai.internal.application.OpenAIGateway;
import com.example.webapptemplate.ai.internal.adapter.openai.OpenAIHttpGateway;
import com.example.webapptemplate.ai.internal.adapter.openai.OpenAIProperties;
import com.example.webapptemplate.settings.FeaturePolicy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@Configuration
@EnableConfigurationProperties(OpenAIProperties.class)
class AiConfiguration {
    @Bean OpenAIGateway openaiGateway(OpenAIProperties config,@org.springframework.beans.factory.annotation.Value("${app.ai.mode:live}") String mode) {
        return switch(mode) {case "live" -> new OpenAIHttpGateway(config);case "demo" -> new com.example.webapptemplate.ai.internal.adapter.openai.DemoOpenAIGateway(config.getModel());default -> throw new IllegalArgumentException("APP_AI_MODE must be live or demo");};
    }
    @Bean com.example.webapptemplate.ai.AiText aiText(OpenAIGateway gateway,FeaturePolicy policy,com.example.webapptemplate.platform.ImageCodec codec) {
        return new com.example.webapptemplate.ai.internal.application.GenerateText(gateway,policy,codec);
    }
    @Bean AiConnectivity aiConnectivity(OpenAIGateway gateway, FeaturePolicy policy) {
        return new CheckOpenAI(gateway,policy);
    }
    @Bean com.example.webapptemplate.ai.AiDrafts aiDrafts(OpenAIGateway gateway,FeaturePolicy policy,com.example.webapptemplate.platform.ImageCodec codec) {
        return new com.example.webapptemplate.ai.internal.application.GenerateDraft(gateway,policy,codec);
    }
}
