package com.example.webapptemplate.operations;

import com.example.webapptemplate.operations.internal.adapter.persistence.RecoveryService;
import org.springframework.boot.SpringApplication;
import java.nio.file.Path;

public final class MaintenanceCommand {
    public static void run(Class<?> application,String[] args) {
        int result=0;
        try(var context=SpringApplication.run(application,args)) {
            var env=context.getEnvironment(); var recovery=context.getBean(RecoveryService.class);
            if(!env.getProperty("app.environment","local").equals("local")) throw new IllegalStateException("CLI maintenance requires local environment.");
            switch(env.getProperty("maintenance.action","")) {
                case "backup" -> System.out.println("BACKUP file="+recovery.backup());
                case "restore" -> System.out.println("RESTORE "+recovery.restore(Path.of(env.getRequiredProperty("maintenance.file")),env.getRequiredProperty("maintenance.schema")));
                default -> throw new IllegalArgumentException("Unsupported maintenance action");
            }
        } catch(Exception failure) {
            System.err.println("MAINTENANCE failed. Existing application data is unchanged; review the isolated restore target and configuration."); result=1;
        }
        System.exit(result);
    }
    private MaintenanceCommand() {}
}
