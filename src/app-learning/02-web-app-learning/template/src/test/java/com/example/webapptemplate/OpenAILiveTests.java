package com.example.webapptemplate;

import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.ai.internal.adapter.openai.OpenAIHttpGateway;
import com.example.webapptemplate.ai.internal.adapter.openai.OpenAIProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.assertj.core.api.Assertions.*;

/** Explicit opt-in only. Fixed public test sentence, never user data. */
@EnabledIfEnvironmentVariable(named="RUN_OPENAI_LIVE",matches="true")
class OpenAILiveTests {
    @Test void checksRealOpenAIOnce() {
        var properties=new OpenAIProperties();
        properties.setApiKey(System.getenv("OPENAI_API_KEY"));
        String model=System.getenv("OPENAI_MODEL");
        if(model!=null && !model.isBlank()) properties.setModel(model);
        assertThat(properties.valid()).as("OpenAI configuration is present").isTrue();
        var start=System.nanoTime();
        var result=new OpenAIHttpGateway(properties).probe();
        System.out.println("OpenAI live check: status="+result+", model="+properties.getModel()
            +", elapsedMs="+(System.nanoTime()-start)/1_000_000);
        assertThat(result).isEqualTo(Status.SUCCESS);
    }
}
