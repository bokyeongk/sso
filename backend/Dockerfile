# ── Build stage ──────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app

COPY gradlew .
COPY gradle gradle/
RUN chmod +x gradlew

# 의존성 레이어 캐시 분리 (소스 변경 시 재다운로드 방지)
COPY build.gradle.kts settings.gradle.kts ./
COPY libs libs/
RUN ./gradlew dependencies --no-daemon --quiet 2>/dev/null || true

COPY src src/
RUN ./gradlew bootJar -x test --no-daemon

# ── Runtime stage ─────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

COPY --from=build /app/build/libs/*.jar app.jar

EXPOSE 8087

ENTRYPOINT ["java", "-jar", "app.jar"]
