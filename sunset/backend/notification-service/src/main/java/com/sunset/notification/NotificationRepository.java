package com.sunset.notification;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;
public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findByRecipientUuidOrderByCreatedAtDesc(String recipientUuid, Pageable pageable);
    long countByRecipientUuidAndReadFalse(String recipientUuid);
}
