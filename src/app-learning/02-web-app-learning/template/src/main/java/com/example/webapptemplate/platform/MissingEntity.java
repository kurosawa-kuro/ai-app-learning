package com.example.webapptemplate.platform;

/** HTTPステータスへの変換はWeb側の責務。 */
public class MissingEntity extends RuntimeException {
    public MissingEntity(String message) { super(message); }
}
