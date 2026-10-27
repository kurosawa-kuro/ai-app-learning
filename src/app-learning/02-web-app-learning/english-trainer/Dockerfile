# Built by Render from Git; local Docker is not required.
FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
COPY src src
COPY admin-pico/src admin-pico/src
# Tests need the real Supabase test schema; run them locally with ./run-local.sh -Action test.
RUN sh mvnw -B -DskipTests package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN useradd --system --no-create-home app
COPY certs/prod-ca-2021.crt certs/
COPY --from=build /src/target/web-app-template-0.0.1-SNAPSHOT.jar app.jar
USER app
ENV SPRING_PROFILES_ACTIVE=render \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:TieredStopAtLevel=1"
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "app.jar"]
