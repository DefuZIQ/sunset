# Используем официальный образ OpenJDK в качестве базового
FROM openjdk:17-jdk-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файл jar в контейнер
COPY target/auth-service.jar auth-service.jar

# Открываем порт, на котором будет работать сервис
EXPOSE 8081

# Указываем команду для запуска приложения
ENTRYPOINT ["java", "-jar", "auth-service.jar"]
