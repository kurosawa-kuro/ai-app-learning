package com.example.webapptemplate.auth.internal.adapter.web;

import com.example.webapptemplate.auth.SignedInUser;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;

/** Exposes the signed-in account to the shared shell. Null while auth is disabled. */
@ControllerAdvice
public class SignedInUserAdvice {
    @ModelAttribute("signedInUser")
    public SignedInUser signedInUser() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        return authentication != null && authentication.getPrincipal() instanceof SignedInUser user ? user : null;
    }
}
