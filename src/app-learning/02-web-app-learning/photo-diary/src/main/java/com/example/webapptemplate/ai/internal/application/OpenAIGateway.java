package com.example.webapptemplate.ai.internal.application;

import com.example.webapptemplate.ai.AiCheckResult.Status;

/** No credentials or HTTP types cross this boundary. */
public interface OpenAIGateway {
    boolean configured();
    String model();
    Status probe();
    record Generated(Status status,String text) {}
    Generated generate(String instruction,String input,com.example.webapptemplate.platform.ImageData image);
    default Generated generateMany(String instruction,String input,java.util.List<com.example.webapptemplate.platform.ImageData> images) {
        if(images.size()>1) throw new IllegalArgumentException("This adapter supports one image");
        return generate(instruction,input,images.isEmpty()?null:images.get(0));
    }
}
