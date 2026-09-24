package com.sunset.notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;
public interface NewsletterSubscriptionRepository extends JpaRepository<NewsletterSubscription,UUID>{ Optional<NewsletterSubscription> findByEmailIgnoreCase(String email); Optional<NewsletterSubscription> findFirstByUserIdOrderByUpdatedAtDesc(String userId); }
