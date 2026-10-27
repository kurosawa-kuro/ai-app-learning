package com.example.webapptemplate.ai.internal.application;
import java.util.UUID;
import com.example.webapptemplate.ai.AiDraftResult;
public interface DraftStore {
 boolean claim(UUID id,String owner,String fingerprint,String model,String version);
 AiDraftResult find(UUID id,String owner);
 boolean matches(UUID id,String owner,String fingerprint);
 void finish(UUID id,String state,String text,String message);
}
