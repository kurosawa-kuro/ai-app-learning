package com.example.webapptemplate.auth.internal;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("app.auth")
public class AuthProperties {
    private boolean enabled;
    private String url = "";
    private String publishableKey = "";
    private String home = "/";
    private String callbackUrl = "";
    public String getCallbackUrl() { return callbackUrl; }
    public void setCallbackUrl(String value) { callbackUrl = value; }
    private Duration timeout = Duration.ofSeconds(10);
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean value) { enabled = value; }
    public String getUrl() { return url; }
    public void setUrl(String value) { url = value == null ? "" : value.replaceAll("/+$", ""); }
    public String getPublishableKey() { return publishableKey; }
    public void setPublishableKey(String value) { publishableKey = value; }
    public String getHome() { return home; }
    public void setHome(String value) { home = value; }
    public Duration getTimeout() { return timeout; }
    public void setTimeout(Duration value) { timeout = value; }
    public String issuer() { return url + "/auth/v1"; }

    /** Fail at startup instead of showing a login button that cannot work. */
    void requireValid() {
        boolean local = url.matches("http://(127\\.0\\.0\\.1|localhost)(:\\d+)?");
        if (!(url.matches("https://[a-z0-9.-]+") || local))
            throw new IllegalStateException("APP_AUTH_ENABLED=true needs SUPABASE_AUTH_URL (https://<project>.supabase.co).");
        if (publishableKey == null || publishableKey.isBlank() || publishableKey.contains("\n"))
            throw new IllegalStateException("APP_AUTH_ENABLED=true needs SUPABASE_AUTH_PUBLISHABLE_KEY.");
        if (callbackUrl == null || !callbackUrl.matches("https://[a-zA-Z0-9.-]+(?::[0-9]+)?/auth/callback|http://(?:localhost|127\\.0\\.0\\.1)(?::[0-9]+)?/auth/callback"))
            throw new IllegalStateException("APP_AUTH_CALLBACK_URL must be the fixed public HTTPS /auth/callback URL (HTTP only on localhost).");
        if (home == null || !home.matches("/[a-zA-Z0-9/_-]*") || home.startsWith("//"))
            throw new IllegalStateException("APP_AUTH_HOME must be a path such as /evaluation.");
    }
    @Override public String toString() { return "AuthProperties[url=" + url + ", key redacted]"; }
}
