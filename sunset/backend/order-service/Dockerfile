# Используем официальный образ OpenJDK в качестве базового
FROM openjdk:17-jdk-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файл jar в контейнер
COPY target/order-service.jar order-service.jar

# Открываем порт, на котором будет работать сервис
EXPOSE 8084

# Указываем команду для запуска приложения
ENTRYPOINT ["java", "-jar", "order-service.jar"]
