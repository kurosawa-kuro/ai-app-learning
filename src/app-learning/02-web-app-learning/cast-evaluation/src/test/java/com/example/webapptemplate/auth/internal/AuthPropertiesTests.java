package com.example.webapptemplate.auth.internal;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class AuthPropertiesTests {
    @Test void requiresFixedCallbackAndRejectsExternalHomeAndSecretKey() {
        var p = new AuthProperties();
        p.setUrl("https://project.supabase.co"); p.setPublishableKey("sb_publishable_example");
        assertThatThrownBy(p::requireValid).isInstanceOf(IllegalStateException.class);
        p.setCallbackUrl("https://app.example.com/auth/callback");
        assertThatCode(p::requireValid).doesNotThrowAnyException();
        for (String home : new String[]{"//attacker.example", "/\\attacker.example", "/%2f%2fattacker.example", "/bad\r\nHeader:value"}) {
            p.setHome(home);
            assertThatThrownBy(p::requireValid).isInstanceOf(IllegalStateException.class);
        }
        p.setHome("/evaluation"); p.setPublishableKey("sb_secret_example");
        assertThatThrownBy(p::requireValid).isInstanceOf(IllegalStateException.class);
    }
}
