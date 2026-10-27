package com.example.webapptemplate.learning;
import com.example.webapptemplate.authors.AuthorOperations;
import java.util.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
@Controller public class LearningController {
 private final LearningService service;private final AuthorOperations users;
 public LearningController(LearningService service,AuthorOperations users){this.service=service;this.users=users;}
 @GetMapping("/learning") public String show(@RequestParam(required=false)UUID user,Model model){var choices=users.choices();if(user==null&&!choices.isEmpty())user=choices.get(0).id();model.addAttribute("learners",choices);model.addAttribute("learner",user);model.addAttribute("questions",service.questions());model.addAttribute("history",service.history(user));return "learning/index";}
 @PostMapping("/learning") @ResponseBody public ResponseEntity<?> submit(@RequestParam UUID requestId,@RequestParam UUID user,@RequestParam String kind,@RequestParam(defaultValue="")String question,@RequestParam String input,HttpSession session){synchronized(session){try{return ResponseEntity.ok(service.submit(requestId,user,kind,question,input));}catch(IllegalArgumentException e){return ResponseEntity.badRequest().body(Map.of("error",e.getMessage()));}catch(org.springframework.dao.DataAccessException e){return ResponseEntity.status(503).body(Map.of("error","履歴に保存できませんでした。入力を残して再試行できます。"));}}}
}
