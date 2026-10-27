package com.example.webapptemplate.platform.internal.adapter.web;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import com.example.webapptemplate.platform.RuntimeInfo;
import org.springframework.core.env.Environment;
import org.springframework.security.config.Customizer;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

@Configuration
public class WebSecurity {
    @Bean
    public SecurityFilterChain security(HttpSecurity http, RuntimeInfo info, Environment env) throws Exception {
        if(info.accessMode().equals("local")) {
            String bind=env.getProperty("server.address","127.0.0.1");
            if(info.production() || !java.util.Set.of("127.0.0.1","::1","localhost").contains(bind))
                throw new IllegalStateException("Public binding requires app.access.mode=basic and an access password.");
            http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll()).httpBasic(AbstractHttpConfigurer::disable);
        } else if(info.accessMode().equals("basic")) {
            String password=env.getProperty("app.access.password","");
            if(password.length()<20) throw new IllegalStateException("Set an access password of at least 20 characters.");
            http.authorizeHttpRequests(auth -> auth.requestMatchers("/healthz").permitAll().anyRequest().authenticated()).httpBasic(Customizer.withDefaults());
        } else throw new IllegalStateException("Unsupported access mode.");
        return http.formLogin(AbstractHttpConfigurer::disable).logout(AbstractHttpConfigurer::disable).build();
    }

    @Bean
    public UserDetailsService noLoginUsers(RuntimeInfo info, Environment env) {
        if(info.accessMode().equals("basic")) {
            var encoder=org.springframework.security.crypto.factory.PasswordEncoderFactories.createDelegatingPasswordEncoder();
            return new InMemoryUserDetailsManager(User.withUsername(env.getProperty("app.access.user","starter"))
                .password(encoder.encode(env.getProperty("app.access.password",""))).roles("ENVIRONMENT").build());
        }
        return username -> { throw new UsernameNotFoundException("Login is not enabled"); };
    }
}
