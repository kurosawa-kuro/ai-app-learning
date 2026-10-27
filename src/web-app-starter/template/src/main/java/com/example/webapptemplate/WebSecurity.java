package com.example.webapptemplate;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

@Configuration
class WebSecurity {
    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        // No login; retain CSRF and security headers for the local form-based app.
        return http.authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable).build();
    }

    @Bean
    UserDetailsService noLoginUsers() {
        return username -> { throw new UsernameNotFoundException("Login is not enabled"); };
    }
}
