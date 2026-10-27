package com.example.webapptemplate;

import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.ai.internal.adapter.gemini.GeminiHttpGateway;
import com.example.webapptemplate.ai.internal.adapter.gemini.GeminiProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.assertj.core.api.Assertions.*;

/** Explicit opt-in only. Fixed public test sentence, never user data. */
@EnabledIfEnvironmentVariable(named="RUN_GEMINI_LIVE",matches="true")
class GeminiLiveTests {
    @Test void checksRealGeminiOnce() {
        var properties=new GeminiProperties();
        properties.setApiKey(System.getenv("GEMINI_API_KEY"));
        String model=System.getenv("GEMINI_MODEL");
        if(model!=null && !model.isBlank()) properties.setModel(model);
        assertThat(properties.valid()).as("Gemini configuration is present").isTrue();
        var start=System.nanoTime();
        var result=new GeminiHttpGateway(properties).probe();
        System.out.println("Gemini live check: status="+result+", model="+properties.getModel()
            +", elapsedMs="+(System.nanoTime()-start)/1_000_000);
        assertThat(result).isEqualTo(Status.SUCCESS);
    }
}
