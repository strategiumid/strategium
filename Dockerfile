FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /workspace

COPY pom.xml ./
COPY src ./src
COPY frontend ./frontend

RUN mkdir -p src/main/resources/static \
    && cp -R frontend/. src/main/resources/static/ \
    && mvn -B -DskipTests package spring-boot:repackage

FROM eclipse-temurin:17-jre

WORKDIR /app

ENV SERVER_PORT=8080
ENV STRATEGIUM_FRONTEND_URL=/
ENV SPRING_DATASOURCE_URL=jdbc:h2:file:/data/strategium;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DEFAULT_NULL_ORDERING=HIGH
ENV SPRING_DATASOURCE_USERNAME=sa
ENV SPRING_DATASOURCE_PASSWORD=
ENV SPRING_DATASOURCE_DRIVER=org.h2.Driver

COPY --from=build /workspace/target/strategium-0.0.1-SNAPSHOT.jar /app/app.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
