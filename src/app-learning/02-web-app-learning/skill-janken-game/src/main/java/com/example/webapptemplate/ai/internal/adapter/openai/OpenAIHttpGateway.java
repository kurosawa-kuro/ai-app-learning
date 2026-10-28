package com.example.webapptemplate.ai.internal.adapter.openai;

import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.ai.internal.application.OpenAIGateway;
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

public final class OpenAIHttpGateway implements OpenAIGateway {
    public static final String PROMPT="Reply with only OK. This is a connection test.";
    private final OpenAIProperties properties;
    private final RestClient client;
    public OpenAIHttpGateway(OpenAIProperties properties) {
        this(properties, builder(properties));
    }
    // Builder injection enables mock HTTP tests, never a user-supplied endpoint.
    public OpenAIHttpGateway(OpenAIProperties properties, RestClient.Builder builder) {
        this.properties=properties;
        this.client=builder.baseUrl("https://api.openai.com/v1").build();
    }
    private static RestClient.Builder builder(OpenAIProperties properties) {
        var factory=new JdkClientHttpRequestFactory(HttpClient.newBuilder()
            .followRedirects(HttpClient.Redirect.NEVER).connectTimeout(Duration.ofSeconds(5)).build());
        factory.setReadTimeout(properties.valid() ? properties.getTimeout() : Duration.ofSeconds(20));
        return RestClient.builder().requestFactory(factory);
    }
    public boolean configured() { return properties.valid(); }
    public String model() {
        return properties.getModel()!=null && properties.getModel().matches("gpt-[a-z0-9.-]{1,80}")
            ? properties.getModel() : "未設定";
    }
    public Status probe() { return request(PROMPT,"",List.of(),128).status(); }
    public Generated generate(String instruction,String input,com.example.webapptemplate.platform.ImageData image) {
        return generateMany(instruction,input,image==null?List.of():List.of(image));
    }
    public Generated generateMany(String instruction,String input,List<com.example.webapptemplate.platform.ImageData> images) {
        return request(instruction,input,images,1024);
    }
    private Generated request(String instruction,String input,List<com.example.webapptemplate.platform.ImageData> images,int limit) {
        if(!configured()) return new Generated(Status.UNCONFIGURED,"");
        var parts=new java.util.ArrayList<Map<String,Object>>();
        parts.add(Map.of("type","input_text","text",input.isEmpty()?instruction:instruction+"\n\n利用者の素材：\n"+input));
        for(var image:images) parts.add(Map.of("type","input_image","image_url","data:"+image.type()+";base64,"+java.util.Base64.getEncoder().encodeToString(image.bytes())));
        try {
            Map<?,?> response=client.post().uri("/responses")
                .header("Authorization","Bearer "+properties.getApiKey()).contentType(MediaType.APPLICATION_JSON)
                .body(Map.of("model",model(),"store",false,"input",List.of(Map.of("role","user","content",parts)),"max_output_tokens",limit))
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
        if(response==null || !"completed".equals(response.get("status")) || !(response.get("output") instanceof List<?> output)) return "";
        var text=new StringBuilder();
        for(Object item:output) {
            if(!(item instanceof Map<?,?> message) || !"message".equals(message.get("type")) || !(message.get("content") instanceof List<?> parts)) continue;
            for(Object part:parts) if(part instanceof Map<?,?> content) {
                if("refusal".equals(content.get("type"))) return "";
                if("output_text".equals(content.get("type")) && content.get("text") instanceof String value) text.append(value);
            }
        }
        return text.toString().trim();
    }
}
