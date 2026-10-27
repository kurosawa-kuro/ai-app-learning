package com.example.webapptemplate.platform;

/** Deliberately excludes free text, image data, credentials and claimed authenticated identities. */
public interface AuditTrail {
    void record(String operation, String result, String reference);
    AuditTrail NONE = (operation, result, reference) -> {};
}
