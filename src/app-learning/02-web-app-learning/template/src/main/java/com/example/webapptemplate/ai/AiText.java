package com.example.webapptemplate.ai;
import java.util.List;
import java.util.UUID;
import com.example.webapptemplate.platform.ImageUpload;
/** Instructions are selected by the application, never accepted as an HTTP endpoint URL. */
public interface AiText {
    AiDraftResult generate(UUID requestId,String instruction,String input,List<ImageUpload> images);
}
