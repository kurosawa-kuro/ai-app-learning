package com.example.webapptemplate;

import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.core.importer.ImportOption;
import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;
import java.util.Map;
import java.util.Set;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static org.assertj.core.api.Assertions.assertThat;

class ArchitectureTests {
    @Test void featureModulesHaveNoCyclesOrInternalAccess() {
        var modules = ApplicationModules.of(WebAppTemplateApplication.class);
        assertThat(modules.stream().map(module -> module.getIdentifier().toString()))
            .containsExactlyInAnyOrder("authors", "posts", "settings", "platform", "shell", "games", "exports", "bootstrap", "ai");
        modules.verify();
    }

    @Test void coreDoesNotDependOnFrameworksOrAdapters() {
        var classes = new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.example.webapptemplate");
        noClasses().that().resideInAnyPackage("..internal.domain..", "..internal.application..")
            .should().dependOnClassesThat().resideInAnyPackage(
                "org.springframework..", "jakarta..", "java.sql..", "javax.sql..", "..internal.adapter..", "java.awt..", "javax.imageio..")
            .check(classes);
        noClasses().that().resideInAPackage("..internal.domain..")
            .should().dependOnClassesThat().resideInAnyPackage("..internal.application..", "..platform..")
            .check(classes);
        noClasses().that().resideInAnyPackage("..internal.domain..", "..internal.application..")
            .should().dependOnClassesThat().haveSimpleName("Uploads").check(classes);
        noClasses().that().resideInAnyPackage("..internal.domain..", "..internal.application..")
            .should().dependOnClassesThat().haveSimpleName("BrowserSelection").check(classes);
        noClasses().that().resideInAPackage("..platform..")
            .should().dependOnClassesThat().resideInAnyPackage("..authors..", "..posts..", "..settings..", "..shell..", "..bootstrap..")
            .check(classes);
    }

    @Test void featureDependencyDirectionsAreExplicit() {
        var imported = new ClassFileImporter().withImportOption(ImportOption.Predefined.DO_NOT_INCLUDE_TESTS)
            .importPackages("com.example.webapptemplate");
        var allowed = Map.of(
            "platform", Set.<String>of(),
            "authors", Set.of("platform"),
            "settings", Set.of("platform"),
            "posts", Set.of("authors", "settings", "platform"),
            "exports", Set.of("authors", "posts"),
            "games", Set.<String>of(),
            "shell", Set.of("authors", "settings", "platform"),
            "bootstrap", Set.of("settings", "platform"),
            "ai", Set.of("platform", "settings"));
        allowed.forEach((module, dependencies) -> {
            for (var other : allowed.keySet()) {
                if (other.equals(module) || dependencies.contains(other)) continue;
                noClasses().that().resideInAPackage("com.example.webapptemplate." + module + "..")
                    .should().dependOnClassesThat().resideInAPackage("com.example.webapptemplate." + other + "..")
                    .check(imported);
            }
        });
    }
}
