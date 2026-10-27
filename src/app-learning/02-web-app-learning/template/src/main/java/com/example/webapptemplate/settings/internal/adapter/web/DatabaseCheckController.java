package com.example.webapptemplate.settings.internal.adapter.web;
import java.util.Map;
import javax.sql.DataSource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
@RestController
public class DatabaseCheckController {
 private final DataSource source;
 public DatabaseCheckController(DataSource source){this.source=source;}
 @PostMapping("/admin/database-check") public ResponseEntity<?> check(){
  long start=System.nanoTime();
  try(var connection=source.getConnection();var statement=connection.createStatement()){
   statement.setQueryTimeout(3);
   try(var result=statement.executeQuery("select 1")){if(!result.next()||result.getInt(1)!=1)throw new java.sql.SQLException();}
   return ResponseEntity.ok(Map.of("ok",true,"message","DBに接続できました。","elapsedMs",(System.nanoTime()-start)/1000000));
  }catch(java.sql.SQLException e){return ResponseEntity.status(503).body(Map.of("ok",false,"message","DBに接続できませんでした。時間をおいて再確認してください。","elapsedMs",(System.nanoTime()-start)/1000000));}
 }
}
