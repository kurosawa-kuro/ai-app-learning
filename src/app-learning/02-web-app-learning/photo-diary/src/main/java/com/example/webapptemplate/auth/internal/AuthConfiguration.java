package com.example.webapptemplate.auth.internal;

import com.example.webapptemplate.auth.internal.adapter.persistence.JdbcAdminList;
import com.example.webapptemplate.auth.internal.adapter.supabase.SupabaseAuthGateway;
import com.example.webapptemplate.auth.internal.adapter.web.AuthPaths;
import com.example.webapptemplate.auth.internal.adapter.web.SupabaseSessionFilter;
import com.example.webapptemplate.platform.BrowserCsrf;
import java.nio.charset.StandardCharsets;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.client.RestTemplate;

/** Active only with APP_AUTH_ENABLED=true. Replaces the open educational security chain. */
@Configuration
@ConditionalOnProperty(name = "app.auth.enabled", havingValue = "true")
@EnableConfigurationProperties(AuthProperties.class)
class AuthConfiguration {
    @Bean JwtDecoder supabaseJwtDecoder(AuthProperties properties) {
        properties.requireValid();
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(5000);
        factory.setReadTimeout((int) properties.getTimeout().toMillis());
        var decoder = NimbusJwtDecoder.withJwkSetUri(properties.issuer() + "/.well-known/jwks.json")
            .jwsAlgorithm(SignatureAlgorithm.ES256).restOperations(new RestTemplate(factory)).build();
        decoder.setJwtValidator(JwtValidators.createDefaultWithIssuer(properties.issuer()));
        return decoder;
    }

    @Bean SupabaseAuthGateway supabaseAuthGateway(AuthProperties properties) {
        return new SupabaseAuthGateway(properties);
    }

    @Bean JdbcAdminList adminList(JdbcClient jdbc) {
        return new JdbcAdminList(jdbc);
    }

    @Bean SecurityFilterChain signedInSecurity(HttpSecurity http, JwtDecoder decoder, SupabaseAuthGateway gateway, JdbcAdminList admins) throws Exception {
        return http.csrf(config -> config.csrfTokenRepository(BrowserCsrf.repository()))
            // The cookie restores the sign-in on every request. Session management would treat each one
            // as a new login and rotate the CSRF token, breaking forms already on the page.
            .sessionManagement(AbstractHttpConfigurer::disable)
            .addFilterBefore(new SupabaseSessionFilter(decoder, gateway, admins), UsernamePasswordAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(AuthPaths.PUBLIC.toArray(String[]::new)).permitAll()
                .anyRequest().hasAuthority("ROLE_ADMIN"))
            .exceptionHandling(errors -> errors.authenticationEntryPoint((request, response, failure) -> {
                // Pages go to the login screen; fetch/form scripts get a message they can show.
                if ("GET".equals(request.getMethod()) && !"true".equals(request.getHeader("X-UI-Form"))) {
                    response.sendRedirect(request.getContextPath() + "/login");
                    return;
                }
                response.setStatus(401);
                response.setContentType("application/json;charset=UTF-8");
                response.getOutputStream().write("{\"error\":\"ログインの有効期限が切れました。入力内容を控えてから、再読み込みしてログインしてください。\"}"
                    .getBytes(StandardCharsets.UTF_8));
            }))
            .httpBasic(AbstractHttpConfigurer::disable).formLogin(AbstractHttpConfigurer::disable)
            .logout(AbstractHttpConfigurer::disable).build();
    }

    // Prevent Boot from creating a generated password/user. Sign-in only goes through Supabase Auth.
    @Bean UserDetailsService noPasswordUsers() {
        return name -> { throw new UsernameNotFoundException("Sign in with Google"); };
    }
}
