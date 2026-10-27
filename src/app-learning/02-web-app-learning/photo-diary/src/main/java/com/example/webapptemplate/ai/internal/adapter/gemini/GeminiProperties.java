package com.example.webapptemplate.ai.internal.adapter.gemini;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.gemini")
public class GeminiProperties {
    private String apiKey="";
    private String model="gemini-3.5-flash-lite";
    private Duration timeout=Duration.ofSeconds(20);
    public String getApiKey() { return apiKey; }
    public void setApiKey(String value) { apiKey=value; }
    public String getModel() { return model; }
    public void setModel(String value) { model=value; }
    public Duration getTimeout() { return timeout; }
    public void setTimeout(Duration value) { timeout=value; }
    public boolean valid() {
        return apiKey!=null && !apiKey.isBlank() && !apiKey.contains("\r") && !apiKey.contains("\n")
            && model!=null && model.matches("gemini-[a-z0-9.-]{1,80}")
            && timeout!=null && timeout.compareTo(Duration.ofSeconds(1))>=0
            && timeout.compareTo(Duration.ofSeconds(60))<=0;
    }
    @Override public String toString() { return "GeminiProperties[credentials redacted]"; }
}
