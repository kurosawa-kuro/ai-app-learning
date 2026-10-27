package com.example.webapptemplate.bootstrap;
import com.example.webapptemplate.bootstrap.internal.adapter.persistence.SeedDataService;

import java.util.Set;
import org.springframework.boot.SpringApplication;

public final class SeedDataCommand {
    public static void run(Class<?> application, String[] args) {
        int exit = 0;
        // A temporary local HTTP port lets the existing web configuration initialize unchanged.
        try (var context = SpringApplication.run(application, args)) {
            var environment = context.getEnvironment();
            String action = environment.getProperty("seed.action", "");
            String schema = environment.getProperty("spring.flyway.default-schema");
            if(!action.equals("preview") && !environment.getProperty("app.environment","local").equals("local"))
                throw new IllegalArgumentException("Seed mutations are restricted to the local environment.");
            if (!Set.of("preview", "add", "reset", "cleanup", "images").contains(action)
                    || !Set.of("photo_diary", "photo_diary_seed_test").contains(schema)) {
                throw new IllegalArgumentException("Seed action/schema is not allowed.");
            }
            var seed = context.getBean(SeedDataService.class);
            System.out.println("SEED before: " + seed.preview());
            switch (action) {
                case "add", "reset" -> System.out.println("SEED result: " + seed.seed(action.equals("reset")));
                case "cleanup" -> System.out.println("SEED pendingCleanup=" + seed.cleanup());
                case "images" -> System.out.println("SEED imagesAdded=" + seed.fillMissingImages());
                default -> { }
            }
            System.out.println("SEED after: " + seed.preview());
            if (!action.equals("preview") && seed.pendingCleanup() > 0) exit = 2;
        } catch (Exception failure) {
            System.err.println("SEED failed. Check DB/Storage configuration and run seed-preview before retrying. No credentials are printed.");
            exit = 1;
        }
        System.exit(exit);
    }
    private SeedDataCommand() {}
}
