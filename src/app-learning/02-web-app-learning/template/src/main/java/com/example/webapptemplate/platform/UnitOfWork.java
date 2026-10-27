package com.example.webapptemplate.platform;

import java.util.function.Supplier;

public interface UnitOfWork {
    <T> T execute(Supplier<T> work);
    default void run(Runnable work) { execute(() -> { work.run(); return null; }); }
}
