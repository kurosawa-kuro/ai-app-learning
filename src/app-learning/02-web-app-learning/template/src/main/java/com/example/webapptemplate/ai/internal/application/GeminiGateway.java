package com.example.webapptemplate.ai.internal.application;

import com.example.webapptemplate.ai.AiCheckResult.Status;

/** No credentials or HTTP types cross this boundary. */
public interface GeminiGateway {
    boolean configured();
    String model();
    Status probe();
    record Generated(Status status,String text) {}
    Generated generate(String instruction,String input,com.example.webapptemplate.platform.ImageData image);

}
