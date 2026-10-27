package com.example.webapptemplate;
import com.example.webapptemplate.bootstrap.SeedDataCommand;
import com.example.webapptemplate.operations.MaintenanceCommand;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class WebAppTemplateApplication {

	public static void main(String[] args) {
        if(java.util.Arrays.stream(args).anyMatch(arg -> arg.startsWith("--maintenance.action="))) {
            MaintenanceCommand.run(WebAppTemplateApplication.class,args); return;
        }
		if (java.util.Arrays.stream(args).anyMatch(arg -> arg.startsWith("--seed.action="))) {
            SeedDataCommand.run(WebAppTemplateApplication.class, args);
			return;
		}
		SpringApplication.run(WebAppTemplateApplication.class, args);
	}

}
