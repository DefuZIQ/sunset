package com.sunset.notification;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "notifications", indexes = @Index(name = "idx_notifications_recipient_created", columnList = "recipient_uuid,created_at"))
public class Notification {
    @Id @GeneratedValue(strategy = GenerationType.UUID) private UUID id;
    @Column(name = "recipient_uuid", nullable = false, length = 80) private String recipientUuid;
    @Column(nullable = false, length = 80) private String type;
    @Column(nullable = false, length = 160) private String title;
    @Column(nullable = false, length = 1000) private String message;
    @Column(nullable = false) private boolean read;
    @Column(name = "created_at", nullable = false) private Instant createdAt;

    protected Notification() {}
    public Notification(String recipientUuid, String type, String title, String message) { this.recipientUuid=recipientUuid; this.type=type; this.title=title; this.message=message; this.read=false; this.createdAt=Instant.now(); }
    public UUID getId(){return id;} public String getRecipientUuid(){return recipientUuid;} public String getType(){return type;} public String getTitle(){return title;} public String getMessage(){return message;} public boolean isRead(){return read;} public Instant getCreatedAt(){return createdAt;} public void markRead(){this.read=true;}
}
