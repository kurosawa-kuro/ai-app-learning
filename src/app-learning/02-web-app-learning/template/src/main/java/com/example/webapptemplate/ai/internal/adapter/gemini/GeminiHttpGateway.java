package com.example.webapptemplate.ai.internal.adapter.gemini;

import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.ai.internal.application.GeminiGateway;
import java.net.http.HttpClient;
import java.net.http.HttpTimeoutException;
import java.net.SocketTimeoutException;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

public final class GeminiHttpGateway implements GeminiGateway {
    public static final String PROMPT="Reply with only OK. This is a connection test.";
    private final GeminiProperties properties;
    private final RestClient client;
    public GeminiHttpGateway(GeminiProperties properties) {
        this(properties, builder(properties));
    }
    // Builder injection enables mock HTTP tests, never a user-supplied endpoint.
    public GeminiHttpGateway(GeminiProperties properties, RestClient.Builder builder) {
        this.properties=properties;
        this.client=builder.baseUrl("https://generativelanguage.googleapis.com/v1beta").build();
    }
    private static RestClient.Builder builder(GeminiProperties properties) {
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(properties.valid() ? properties.getTimeout() : Duration.ofSeconds(20));
        return RestClient.builder().requestFactory(factory);
    }
    public boolean configured() { return properties.valid(); }
    public String model() {
        return properties.getModel()!=null && properties.getModel().matches("gemini-[a-z0-9.-]{1,80}")
            ? properties.getModel() : "未設定";
    }
    public Status probe() { return request(PROMPT,"",null,128).status(); }
    public Generated generate(String instruction,String input,com.example.webapptemplate.platform.ImageData image) {
        return request(instruction,input,image,1024);
    }
    private Generated request(String instruction,String input,com.example.webapptemplate.platform.ImageData image,int limit) {
        if(!configured()) return new Generated(Status.UNCONFIGURED,"");
        var parts=new java.util.ArrayList<Map<String,Object>>();
        parts.add(Map.of("text",input.isEmpty()?instruction:instruction+"\n\n利用者の素材：\n"+input));
        if(image!=null) parts.add(Map.of("inline_data",Map.of("mime_type",image.type(),"data",java.util.Base64.getEncoder().encodeToString(image.bytes()))));
        try {
            Map<?,?> response=client.post().uri("/models/{model}:generateContent",model())
                .header("x-goog-api-key",properties.getApiKey()).contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("contents",List.of(Map.of("role","user","parts",parts)),"generationConfig",Map.of("maxOutputTokens",limit)))
                .retrieve().body(Map.class);
            String text=responseText(response);
            return new Generated(text.isBlank() || text.length()>5000?Status.INVALID_RESPONSE:Status.SUCCESS,text.length()>5000?"":text);
        } catch (RestClientResponseException failure) {
            return new Generated(switch(failure.getStatusCode().value()) {
                case 401,403 -> Status.AUTHENTICATION;
                case 400 -> failure.getResponseBodyAsString().contains("API_KEY_INVALID")
                    || failure.getResponseBodyAsString().contains("API_KEY_EXPIRED")
                    ? Status.AUTHENTICATION : Status.REJECTED;
                case 404 -> Status.MODEL_UNAVAILABLE;
                case 408,504 -> Status.TIMEOUT;
                case 429 -> Status.RATE_LIMIT;
                default -> failure.getStatusCode().is5xxServerError() ? Status.UNAVAILABLE : Status.REJECTED;
            },"");
        } catch (RestClientException failure) {
            for (Throwable cause=failure;cause!=null;cause=cause.getCause()) {
                if (cause instanceof HttpTimeoutException || cause instanceof SocketTimeoutException)
                    return new Generated(Status.TIMEOUT,"");
            }
            return new Generated(failure instanceof org.springframework.web.client.ResourceAccessException
                ? Status.CONNECTION : Status.INVALID_RESPONSE,"");
        }
    }
    private static String responseText(Map<?,?> response) {
        if(response==null || !(response.get("candidates") instanceof List<?> candidates)) return "";
        for(Object candidate:candidates) {
            if(!(candidate instanceof Map<?,?> c) || !"STOP".equals(c.get("finishReason"))
                || !(c.get("content") instanceof Map<?,?> content)
                || !(content.get("parts") instanceof List<?> parts)) continue;
            for(Object part:parts) if(part instanceof Map<?,?> p && !Boolean.TRUE.equals(p.get("thought"))
                && p.get("text") instanceof String text && !text.isBlank()) return text;
        }
        return "";
    }
}
