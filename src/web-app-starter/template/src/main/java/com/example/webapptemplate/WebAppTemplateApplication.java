package com.example.webapptemplate;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class WebAppTemplateApplication {

	public static void main(String[] args) {
		if (java.util.Arrays.stream(args).anyMatch(arg -> arg.startsWith("--seed.action="))) {
			SeedDataCommand.run(args);
			return;
		}
		SpringApplication.run(WebAppTemplateApplication.class, args);
	}

}
