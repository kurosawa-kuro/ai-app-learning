package com.example.webapptemplate.ai;
import java.util.UUID;
import com.example.webapptemplate.platform.ImageUpload;
public interface AiDrafts {
 AiDraftResult generate(UUID id,String input,ImageUpload image);
}
