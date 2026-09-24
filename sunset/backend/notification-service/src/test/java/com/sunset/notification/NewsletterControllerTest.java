package com.sunset.notification;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class NewsletterControllerTest {
    private final NewsletterSubscriptionRepository repository = mock(NewsletterSubscriptionRepository.class);
    private final NewsletterController controller = new NewsletterController(repository);

    @Test void rejectsInvalidEmail() {
        assertThrows(IllegalArgumentException.class, () -> controller.subscribe(Map.of("email", "not-an-email")));
        verify(repository, never()).save(any());
    }

    @Test void normalizesAndSavesNewSubscription() {
        when(repository.findByEmailIgnoreCase("USER@Example.com")).thenReturn(Optional.empty());
        var response = controller.subscribe(Map.of("email", " USER@Example.com ", "userId", "user-1"));
        assertEquals(true, response.get("active"));
        assertEquals("user@example.com", response.get("email"));
        verify(repository).save(argThat(item -> item.isActive() && "user-1".equals(item.getUserId())));
    }

    @Test void unsubscribeIsSafeWhenSubscriptionDoesNotExist() {
        when(repository.findFirstByUserIdOrderByUpdatedAtDesc("user-1")).thenReturn(Optional.empty());
        assertEquals(false, controller.unsubscribe("user-1", null).get("active"));
        verify(repository, never()).save(any());
    }
}
