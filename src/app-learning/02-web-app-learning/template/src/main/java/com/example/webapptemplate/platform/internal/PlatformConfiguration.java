package com.example.webapptemplate.platform.internal;

import com.example.webapptemplate.platform.ImageCleanup;
import com.example.webapptemplate.platform.ImageReferences;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.internal.application.CleanupQueue;
import com.example.webapptemplate.platform.internal.application.RetryImageCleanup;
import java.util.List;
import org.springframework.context.annotation.*;
@Configuration
class PlatformConfiguration {
    @Bean ImageCleanup imageCleanup(CleanupQueue queue, ImageStore storage, List<ImageReferences> references) {
        return new RetryImageCleanup(queue, storage, references);
    }
}
