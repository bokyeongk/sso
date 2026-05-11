FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY sso-backend-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8087

ENTRYPOINT ["java", "-jar", "app.jar"]
