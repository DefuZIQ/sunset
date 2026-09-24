package com.sunset.notification;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/subscriptions")
public class NewsletterController {
  private final NewsletterSubscriptionRepository repository;
  public NewsletterController(NewsletterSubscriptionRepository repository){this.repository=repository;}
  @PostMapping public Map<String,Object> subscribe(@RequestHeader(name="user-id",required=false) String userId,@RequestBody Map<String,String> body){String email=body.getOrDefault("email","").trim();if(!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))throw new IllegalArgumentException("Укажите корректный e-mail");NewsletterSubscription item=repository.findByEmailIgnoreCase(email).orElseGet(()->new NewsletterSubscription(email,userId));item.activate(userId);repository.save(item);return Map.of("active",true,"email",item.getEmail());}
  @GetMapping("/status") public Map<String,Object> status(@RequestHeader("user-id") String userId){NewsletterSubscription item=repository.findFirstByUserIdOrderByUpdatedAtDesc(userId).orElse(null);return item==null?Map.of("active",false):Map.of("active",item.isActive(),"email",item.getEmail());}
  @DeleteMapping public Map<String,Object> unsubscribe(@RequestHeader("user-id") String userId){NewsletterSubscription item=repository.findFirstByUserIdOrderByUpdatedAtDesc(userId).orElse(null);if(item!=null){item.deactivate();repository.save(item);}return Map.of("active",false);}
  @ExceptionHandler(IllegalArgumentException.class) @ResponseStatus(org.springframework.http.HttpStatus.BAD_REQUEST) Map<String,String> bad(IllegalArgumentException e){return Map.of("message",e.getMessage());}
}
