package com.sunset.notification;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;
@Entity @Table(name="newsletter_subscriptions", uniqueConstraints=@UniqueConstraint(columnNames="email"))
public class NewsletterSubscription {
  @Id @GeneratedValue(strategy=GenerationType.UUID) private UUID id;
  @Column(nullable=false) private String email;
  private String userId;
  private boolean active=true;
  private OffsetDateTime createdAt=OffsetDateTime.now();
  private OffsetDateTime updatedAt=OffsetDateTime.now();
  protected NewsletterSubscription() {}
  public NewsletterSubscription(String email,String userId){this.email=email.toLowerCase();this.userId=userId;}
  public UUID getId(){return id;} public String getEmail(){return email;} public String getUserId(){return userId;} public boolean isActive(){return active;} public OffsetDateTime getCreatedAt(){return createdAt;}
  public void activate(String value){active=true;userId=value;updatedAt=OffsetDateTime.now();}
  public void deactivate(){active=false;updatedAt=OffsetDateTime.now();}
}
