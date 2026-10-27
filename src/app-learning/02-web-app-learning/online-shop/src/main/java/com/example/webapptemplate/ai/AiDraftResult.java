package com.example.webapptemplate.ai;
import java.util.UUID;
public record AiDraftResult(UUID requestId,String state,String model,String text,String message) {}
