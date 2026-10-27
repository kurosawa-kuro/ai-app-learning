package com.example.webapptemplate.bootstrap.internal;
import com.example.webapptemplate.platform.RecoveryDataset;
import java.util.List;
import org.springframework.stereotype.Component;
@Component
public class TemplateRecoveryDataset implements RecoveryDataset {
 public List<Table> tables() { return List.of(
  new Table("app_users",false,true),new Table("posts",true,true),new Table("user_icons",true,true),
  new Table("app_settings",false,true),new Table("post_requests",false,true),
  new Table("operation_events",false,true),new Table("ai_requests",false,true),new Table("image_cleanup",false,false)); }
}
