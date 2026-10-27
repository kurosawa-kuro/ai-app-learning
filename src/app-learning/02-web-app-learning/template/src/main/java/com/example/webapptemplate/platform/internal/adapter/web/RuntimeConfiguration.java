package com.example.webapptemplate.platform.internal.adapter.web;

import com.example.webapptemplate.platform.RuntimeInfo;
import org.springframework.context.annotation.*;
import org.springframework.core.env.Environment;

@Configuration
class RuntimeConfiguration {
    @Bean RuntimeInfo runtimeInfo(Environment env) {
        String stage=env.getProperty("app.environment","local");
        if(!java.util.Set.of("local","test","production").contains(stage)) throw new IllegalStateException("Invalid app.environment");
        String identity=env.getProperty("spring.datasource.url","").replaceFirst("\\?.*$","")+"/"+env.getProperty("spring.datasource.username","");
        String fingerprint;
        try { fingerprint=java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(identity.getBytes(java.nio.charset.StandardCharsets.UTF_8))).substring(0,10); }
        catch(java.security.NoSuchAlgorithmException impossible) { throw new IllegalStateException(impossible); }
        return new RuntimeInfo(stage,env.getProperty("spring.flyway.default-schema"),
            env.getProperty("app.connection-label","Supabase PostgreSQL"),env.getProperty("app.access.mode","local"),fingerprint);
    }
}
