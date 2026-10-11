package com.sunset.notification;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class NotificationPostgresIntegrationTest {
    private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:16-alpine")
            .withDatabaseName("sunset_notification_test")
            .withUsername("sunset")
            .withPassword("sunset-test");

    static { POSTGRES.start(); }

    @DynamicPropertySource
    static void postgresProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired private NotificationRepository notifications;
    @Autowired private NewsletterSubscriptionRepository subscriptions;

    @Test
    void migrationsCreateBothTablesAndRepositoriesWork() {
        Notification notice = notifications.save(new Notification("customer-1", "ORDER", "Заказ", "Создан"));
        subscriptions.save(new NewsletterSubscription("shopper@example.com", "customer-1"));

        assertThat(notifications.findByRecipientUuidOrderByCreatedAtDesc("customer-1", PageRequest.of(0, 10)))
                .extracting(Notification::getId).contains(notice.getId());
        assertThat(subscriptions.findByEmailIgnoreCase("SHOPPER@example.com")).isPresent();
    }
}
