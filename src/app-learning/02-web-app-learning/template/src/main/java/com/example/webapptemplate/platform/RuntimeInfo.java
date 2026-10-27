package com.example.webapptemplate.platform;

public record RuntimeInfo(String environment, String schema, String connectionLabel, String accessMode, String connectionId) {
    public RuntimeInfo(String environment,String schema,String connectionLabel,String accessMode) {
        this(environment,schema,connectionLabel,accessMode,"test");
    }
    public boolean production() { return environment.equals("production"); }
}
