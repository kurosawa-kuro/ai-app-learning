package com.example.webapptemplate.platform;
import java.util.Map;
import java.util.UUID;
/** Application-owned usage counts. User storage does not know application tables. */
public interface UserReferences { Map<UUID,Long> counts(); }
