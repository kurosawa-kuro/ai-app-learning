package com.example.webapptemplate.ai;

/** Public boundary for the explicit, fixed-message connection check. */
public interface AiConnectivity {
    boolean configured();
    String model();
    AiCheckResult check();
}
