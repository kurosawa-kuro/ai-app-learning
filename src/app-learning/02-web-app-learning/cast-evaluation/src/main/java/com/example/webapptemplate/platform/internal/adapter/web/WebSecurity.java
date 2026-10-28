package com.example.webapptemplate.platform.internal.adapter.web;
import com.example.webapptemplate.platform.BrowserCsrf;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/** Educational app without login. CSRF protection still applies to browser writes. Replaced when app.auth.enabled=true. */
@Configuration
@ConditionalOnProperty(name = "app.auth.enabled", havingValue = "false", matchIfMissing = true)
public class WebSecurity {
 @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
  return http.csrf(config -> config.csrfTokenRepository(BrowserCsrf.repository())).authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
   .httpBasic(AbstractHttpConfigurer::disable).formLogin(AbstractHttpConfigurer::disable)
   .logout(AbstractHttpConfigurer::disable).build();
 }
 // Prevent Boot from creating a generated password/user that this app does not use.
 @Bean UserDetailsService noLoginUsers() {
  return name -> { throw new UsernameNotFoundException("Login is not enabled"); };
 }
}
