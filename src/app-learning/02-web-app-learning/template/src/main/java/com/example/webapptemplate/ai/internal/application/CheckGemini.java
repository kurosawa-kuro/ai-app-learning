package com.example.webapptemplate.ai.internal.application;

import com.example.webapptemplate.ai.AiConnectivity;
import com.example.webapptemplate.ai.AiCheckResult;
import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.settings.FeaturePolicy;
import com.example.webapptemplate.platform.AuditTrail;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.locks.ReentrantLock;

public final class CheckGemini implements AiConnectivity {
    private final GeminiGateway gateway;
    private final FeaturePolicy policy;
    private final AuditTrail audit;
    private final ReentrantLock running = new ReentrantLock();
    public CheckGemini(GeminiGateway gateway, FeaturePolicy policy, AuditTrail audit) {
        this.gateway=gateway; this.policy=policy; this.audit=audit;
    }
    public boolean configured() { return gateway.configured(); }
    public String model() { return gateway.model(); }
    public AiCheckResult check() {
        String id=UUID.randomUUID().toString();
        long start=System.nanoTime();
        if (!policy.aiEnabled()) return result(id,Status.DISABLED,start);
        if (!configured()) return result(id,Status.UNCONFIGURED,start);
        if (!policy.allowsAiModel(model())) return result(id,Status.MODEL_DENIED,start);
        if (!running.tryLock()) return result(id,Status.BUSY,start);
        try {
            // Recheck saved policy immediately before making an external request.
            if (!policy.aiEnabled()) return result(id,Status.DISABLED,start);
            if (!policy.allowsAiModel(model())) return result(id,Status.MODEL_DENIED,start);
            audit.record("ai.check","started",id);
            return result(id,gateway.probe(),start);
        } finally { running.unlock(); }
    }
    private AiCheckResult result(String id, Status status, long start) {
        audit.record("ai.check",status.name(),id);
        return new AiCheckResult(id,status,model(),Instant.now(),(System.nanoTime()-start)/1_000_000);
    }
}
