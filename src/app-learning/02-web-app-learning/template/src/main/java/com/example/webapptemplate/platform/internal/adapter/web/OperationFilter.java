package com.example.webapptemplate.platform.internal.adapter.web;

import com.example.webapptemplate.platform.AuditTrail;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import java.io.IOException;
import java.util.UUID;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
class OperationFilter extends OncePerRequestFilter {
    private final AuditTrail audit;
    OperationFilter(AuditTrail audit) { this.audit=audit; }
    protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        String id=UUID.randomUUID().toString(); response.setHeader("X-Operation-Id",id);
        boolean failed=false;
        try { chain.doFilter(request,response); }
        catch(ServletException | IOException | RuntimeException error) { failed=true; throw error; }
        finally {
            if(!request.getMethod().equals("GET") || response.getStatus()>=400 || failed)
                audit.record(operation(request),failed?"exception":String.valueOf(response.getStatus()),id);
        }
    }
    private String operation(HttpServletRequest request) {
        String path=request.getRequestURI();
        if(path.equals("/admin/settings")) return "settings.save";
        if(path.matches("/admin/users/[^/]+/edit")) return "user.rename";
        if(path.contains("/icon")) return "user.icon";
        if(path.matches("/posts/[^/]+/edit")) return "post.update.http";
        if(path.equals("/posts")) return "post.create.http";
        if(path.startsWith("/admin/operations/")) return "operations.action";
        return "http."+request.getMethod().toLowerCase();
    }
}
