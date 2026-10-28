package com.example.webapptemplate.auth;

import java.util.UUID;

/** The Google account signed in through Supabase Auth and admitted by this app's admin list. */
public record SignedInUser(UUID id, String email, String displayName) {}
