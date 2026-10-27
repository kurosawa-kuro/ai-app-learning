package com.example.webapptemplate.ai.internal.adapter.persistence;
import com.example.webapptemplate.ai.*;
import com.example.webapptemplate.ai.internal.application.DraftStore;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
@Repository
public class JdbcDraftStore implements DraftStore {
 private final JdbcTemplate jdbc;
 public JdbcDraftStore(JdbcTemplate jdbc) { this.jdbc=jdbc; }
 public boolean claim(UUID id,String owner,String fingerprint,String model,String version) {
  return jdbc.update("insert into ai_requests(request_id,owner_id,fingerprint,model,prompt_version) values (?,?,?,?,?) on conflict do nothing",id,owner,fingerprint,model,version)==1;
 }
 public boolean matches(UUID id,String owner,String fingerprint) {
  return Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from ai_requests where request_id=? and owner_id=? and fingerprint=?)",Boolean.class,id,owner,fingerprint));
 }
 public AiDraftResult find(UUID id,String owner) {
  jdbc.update("update ai_requests set state='UNKNOWN',message='処理結果を確認できません。自動再実行はしません。' where request_id=? and owner_id=? and state='RUNNING' and created_at < now()-interval '2 minutes'",id,owner);
  jdbc.update("update ai_requests set state='EXPIRED',result_text='',message='結果の保持期限（7日）を過ぎました。' where request_id=? and owner_id=? and created_at < now()-interval '7 days'",id,owner);
  return jdbc.query("select request_id,state,model,result_text,message from ai_requests where request_id=? and owner_id=?",(rs,row)->new AiDraftResult(rs.getObject(1,UUID.class),rs.getString(2),rs.getString(3),rs.getString(4),rs.getString(5)),id,owner)
   .stream().findFirst().orElseThrow(()->new IllegalArgumentException("このブラウザーの要求が見つかりません。"));
 }
 public void finish(UUID id,String state,String text,String message) {
  jdbc.update("update ai_requests set state=?,result_text=?,message=? where request_id=? and state='RUNNING'",state,text,message,id);
 }
 @org.springframework.scheduling.annotation.Scheduled(fixedDelay=3600000,initialDelay=60000)
 public void expireResults() {
  try { jdbc.update("update ai_requests set state='EXPIRED',result_text='',message='結果の保持期限（7日）を過ぎました。' where state<>'EXPIRED' and created_at < now()-interval '7 days'"); }
  catch(org.springframework.dao.DataAccessException unavailable) { /* Next hourly run retries; no request or secret is logged. */ }
 }
}
