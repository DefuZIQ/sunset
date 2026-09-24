package com.sunset.notification;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
@RestController @RequestMapping("/subscriptions")
public class NewsletterController {
  private final NewsletterSubscriptionRepository repository;
  public NewsletterController(NewsletterSubscriptionRepository repository){this.repository=repository;}
  @PostMapping public Map<String,Object> subscribe(@RequestBody Map<String,String> body){String email=body.getOrDefault("email","").trim();if(!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))throw new IllegalArgumentException("Укажите корректный e-mail");String userId=body.get("userId");NewsletterSubscription item=repository.findByEmailIgnoreCase(email).orElseGet(()->new NewsletterSubscription(email,userId));item.activate(userId);repository.save(item);return Map.of("active",true,"email",item.getEmail());}
  @GetMapping("/status") public Map<String,Object> status(@RequestParam(name="userId",required=false) String userId,@RequestParam(name="email",required=false) String email){NewsletterSubscription item=userId!=null?repository.findFirstByUserIdOrderByUpdatedAtDesc(userId).orElse(null):repository.findByEmailIgnoreCase(email==null?"":email).orElse(null);return item==null?Map.of("active",false):Map.of("active",item.isActive(),"email",item.getEmail());}
  @DeleteMapping public Map<String,Object> unsubscribe(@RequestParam(name="userId",required=false) String userId,@RequestParam(name="email",required=false) String email){NewsletterSubscription item=userId!=null?repository.findFirstByUserIdOrderByUpdatedAtDesc(userId).orElse(null):repository.findByEmailIgnoreCase(email==null?"":email).orElse(null);if(item!=null){item.deactivate();repository.save(item);}return Map.of("active",false);}
  @ExceptionHandler(IllegalArgumentException.class) @ResponseStatus(org.springframework.http.HttpStatus.BAD_REQUEST) Map<String,String> bad(IllegalArgumentException e){return Map.of("message",e.getMessage());}
}
