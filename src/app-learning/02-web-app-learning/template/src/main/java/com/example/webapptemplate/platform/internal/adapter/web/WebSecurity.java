package com.example.webapptemplate.platform.internal.adapter.web;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

/** Educational app: no login. CSRF protection still applies to browser writes. */
@Configuration
public class WebSecurity {
 @Bean SecurityFilterChain security(HttpSecurity http) throws Exception {
  var csrf=new org.springframework.security.web.csrf.CookieCsrfTokenRepository();
  csrf.setHeaderName("X-CSRF-TOKEN");
  csrf.setCookieCustomizer(cookie -> cookie.sameSite("Lax"));
  return http.csrf(config -> config.csrfTokenRepository(csrf)).authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
   .httpBasic(AbstractHttpConfigurer::disable).formLogin(AbstractHttpConfigurer::disable)
   .logout(AbstractHttpConfigurer::disable).build();
 }
 // Prevent Boot from creating a generated password/user that this app does not use.
 @Bean UserDetailsService noLoginUsers() {
  return name -> { throw new UsernameNotFoundException("Login is not enabled"); };
 }
}
