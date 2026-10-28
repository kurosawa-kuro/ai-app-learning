package com.example.webapptemplate.auth.internal.adapter.web;

import com.example.webapptemplate.auth.internal.AuthProperties;
import com.example.webapptemplate.auth.internal.adapter.supabase.SupabaseAuthGateway.Session;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.assertj.core.api.Assertions.*;

class SessionCookiesTests {
    @Test void httpsPublicUrlSetsSecureEvenBehindAnHttpProxyAndClearsWithSameAttributes() {
        var p = new AuthProperties(); p.setCallbackUrl("https://app.example.com/auth/callback");
        var cookies = new SessionCookies(p);
        var request = new MockHttpServletRequest();
        var response = new MockHttpServletResponse();
        cookies.store(request, response, new Session("test-access", "test-refresh"));
        cookies.storeVerifier(request, response, "test-verifier");
        cookies.clear(request, response); cookies.clearVerifier(request, response);
        assertThat(response.getHeaders("Set-Cookie")).hasSize(6).allSatisfy(value ->
            assertThat(value).contains("Secure", "HttpOnly", "SameSite=Lax"));
        assertThat(response.getHeaders("Set-Cookie").stream().filter(c -> c.contains("Max-Age=0"))).hasSize(3);
    }
}
