package com.sunset.notification;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
@RestController
@RequestMapping("/notifications")
public class NotificationController {
    private final NotificationRepository repository;
    public NotificationController(NotificationRepository repository){this.repository=repository;}
    @GetMapping public List<Notification> list(@RequestHeader("user-id") String userId,@RequestParam(name="limit", defaultValue="30") int limit){return repository.findByRecipientUuidOrderByCreatedAtDesc(userId,PageRequest.of(0,Math.min(Math.max(limit,1),100)));}
    @GetMapping("/unread-count") public Map<String,Long> unread(@RequestHeader("user-id") String userId){return Map.of("count",repository.countByRecipientUuidAndReadFalse(userId));}
    @PostMapping public Notification create(@RequestHeader("user-id") String userId,@Valid @RequestBody CreateRequest request){return repository.save(new Notification(userId,request.type(),request.title(),request.message()));}
    @PatchMapping("/{id}/read") public Map<String,Boolean> markRead(@PathVariable(name="id") UUID id,@RequestHeader("user-id") String userId){Notification n=repository.findById(id).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND));if(!n.getRecipientUuid().equals(userId))throw new ResponseStatusException(HttpStatus.FORBIDDEN);n.markRead();repository.save(n);return Map.of("read",true);}
    public record CreateRequest(@NotBlank String type,@NotBlank String title,@NotBlank String message){}
}
