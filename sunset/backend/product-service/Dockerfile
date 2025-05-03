# Используем официальный образ OpenJDK в качестве базового
FROM openjdk:17-jdk-slim

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем файл jar в контейнер
COPY target/product-service.jar product-service.jar

# Открываем порт, на котором будет работать сервис
EXPOSE 8083

# Указываем команду для запуска приложения
ENTRYPOINT ["java", "-jar", "product-service.jar"]
