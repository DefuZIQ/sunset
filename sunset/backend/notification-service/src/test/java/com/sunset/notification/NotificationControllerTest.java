package com.sunset.notification;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class NotificationControllerTest {
    private final NotificationRepository repository = mock(NotificationRepository.class);
    private final NotificationController controller = new NotificationController(repository);

    @Test void capsNotificationPageAtOneHundred() {
        when(repository.findByRecipientUuidOrderByCreatedAtDesc(eq("user-1"), any(Pageable.class))).thenReturn(List.of());
        controller.list("user-1", 1000);
        verify(repository).findByRecipientUuidOrderByCreatedAtDesc(eq("user-1"), argThat(page -> page.getPageSize() == 100));
    }

    @Test void returnsUnreadCount() {
        when(repository.countByRecipientUuidAndReadFalse("user-1")).thenReturn(7L);
        assertEquals(7L, controller.unread("user-1").get("count"));
    }

    @Test void createsNotificationForTrustedHeaderUser() {
        when(repository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));
        Notification created = controller.create("trusted-user",
                new NotificationController.CreateRequest("SYSTEM", "Тема", "Текст"));
        assertEquals("trusted-user", created.getRecipientUuid());
        verify(repository).save(created);
    }

    @Test void ownerCanMarkNotificationAsRead() {
        UUID id = UUID.randomUUID();
        Notification notification = new Notification("user-1", "ORDER", "Заказ", "Подтверждён");
        when(repository.findById(id)).thenReturn(Optional.of(notification));
        assertTrue(controller.markRead(id, "user-1").get("read"));
        assertTrue(notification.isRead());
        verify(repository).save(notification);
    }

    @Test void anotherUserCannotReadNotification() {
        UUID id = UUID.randomUUID();
        when(repository.findById(id)).thenReturn(Optional.of(new Notification("owner", "ORDER", "Заказ", "Текст")));
        assertThrows(ResponseStatusException.class, () -> controller.markRead(id, "intruder"));
        verify(repository, never()).save(any());
    }
}
