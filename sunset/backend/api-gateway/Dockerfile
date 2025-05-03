# Используем официальный образ OpenJDK в качестве базового
FROM openjdk:17-jdk-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файл jar в контейнер
COPY target/api-gateway.jar api-gateway.jar

# Открываем порт, на котором будет работать сервис
EXPOSE 8080

# Указываем команду для запуска приложения
ENTRYPOINT ["java", "-jar", "api-gateway.jar"]
