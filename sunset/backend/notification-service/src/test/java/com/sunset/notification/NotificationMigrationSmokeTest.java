package com.sunset.notification;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class NotificationMigrationSmokeTest {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> "jdbc:h2:mem:notification_migration;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        registry.add("spring.datasource.driver-class-name", () -> "org.h2.Driver");
        registry.add("spring.datasource.username", () -> "sa");
        registry.add("spring.datasource.password", () -> "");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired private NotificationRepository notifications;
    @Autowired private NewsletterSubscriptionRepository subscriptions;

    @Test
    void liquibaseSchemaSupportsTheEntityWithoutHibernateDdl() {
        Notification saved = notifications.save(new Notification("customer-1", "ORDER", "Заказ", "Создан"));
        subscriptions.save(new NewsletterSubscription("shopper@example.com", "customer-1"));
        assertThat(notifications.findById(saved.getId())).isPresent();
        assertThat(subscriptions.findByEmailIgnoreCase("SHOPPER@example.com")).isPresent();
    }
}
