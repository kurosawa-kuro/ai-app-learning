package com.example.webapptemplate;

import java.util.Set;
import org.springframework.boot.SpringApplication;

final class SeedDataCommand {
    static void run(String[] args) {
        int exit = 0;
        // A temporary local HTTP port lets the existing web configuration initialize unchanged.
        try (var context = SpringApplication.run(WebAppTemplateApplication.class, args)) {
            var environment = context.getEnvironment();
            String action = environment.getProperty("seed.action", "");
            String schema = environment.getProperty("spring.flyway.default-schema");
            if (!Set.of("preview", "add", "reset", "cleanup").contains(action)
                    || !Set.of("app_template", "app_template_seed_test").contains(schema)) {
                throw new IllegalArgumentException("Seed action/schema is not allowed.");
            }
            var seed = context.getBean(SeedDataService.class);
            System.out.println("SEED before: " + seed.preview());
            switch (action) {
                case "add", "reset" -> System.out.println("SEED result: " + seed.seed(action.equals("reset")));
                case "cleanup" -> System.out.println("SEED pendingCleanup=" + seed.cleanup());
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
