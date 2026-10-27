package com.example.webapptemplate.diary;

import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.platform.*;
import com.example.webapptemplate.settings.FeaturePolicy;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

@Service
public class DiaryService {
 public record Entry(UUID id,UUID userId,String userName,LocalDate entryDate,String title,String body,String tags,UUID coverId,OffsetDateTime createdAt){}
 public record Photo(UUID id,String imageBucket,String imageKey,String imageType){}
 public record Page(List<Entry> entries,long page,long pages,long total){}
 private final JdbcClient db; private final UnitOfWork tx; private final AuthorOperations users;
 private final ImageStore storage;private final ImageCodec codec;private final ImageCleanup cleanup;private final FeaturePolicy policy;
 public DiaryService(JdbcClient db,UnitOfWork tx,AuthorOperations users,ImageStore storage,ImageCodec codec,ImageCleanup cleanup,FeaturePolicy policy){this.db=db;this.tx=tx;this.users=users;this.storage=storage;this.codec=codec;this.cleanup=cleanup;this.policy=policy;}
 private static final String SELECT="select e.id,e.user_id,u.name as user_name,e.entry_date,e.title,e.body,e.created_at,coalesce((select string_agg(t.tag,', ' order by t.tag) from diary_tags t where t.entry_id=e.id),'') as tags,(select p.id from diary_photos p where p.entry_id=e.id order by p.position limit 1) as cover_id from diary_entries e join app_users u on u.id=e.user_id ";
 public Page page(String tag,long requested){
  String filter=tag==null?"":tag.strip();if(filter.length()>30)throw new IllegalArgumentException("タグは30文字以内です。");
  String where=filter.isEmpty()?"":" where exists(select 1 from diary_tags t where t.entry_id=e.id and t.tag=:tag) ";
  long total=db.sql("select count(*) from diary_entries e"+where).param("tag",filter).query(Long.class).single();
  long pages=Math.max(1,(total+9)/10),page=Math.max(1,Math.min(requested,pages));
  var entries=db.sql(SELECT+where+" order by e.entry_date desc,e.created_at desc,e.id limit 10 offset :offset").param("tag",filter).param("offset",(page-1)*10).query(Entry.class).list();
  return new Page(entries,page,pages,total);
 }
 public Entry entry(UUID id){return db.sql(SELECT+" where e.id=:id").param("id",id).query(Entry.class).optional().orElseThrow(()->new MissingEntity("日記が見つかりません。"));}
 public List<Photo> photos(UUID id){return db.sql("select id,image_bucket,image_key,image_type from diary_photos where entry_id=:id order by position").param("id",id).query(Photo.class).list();}
 public Photo photo(UUID id){return db.sql("select id,image_bucket,image_key,image_type from diary_photos where id=:id").param("id",id).query(Photo.class).optional().orElseThrow(()->new MissingEntity("写真が見つかりません。"));}
 public List<String> tags(){return db.sql("select distinct tag from diary_tags order by tag").query(String.class).list();}
 public UUID save(UUID id,UUID user,LocalDate date,String title,String body,String rawTags,List<ImageUpload> uploads){
  if(id==null||user==null||date==null||title==null||title.isBlank()||title.length()>120||body==null||body.isBlank()||body.length()>5000||rawTags==null||rawTags.length()>200||uploads==null||uploads.size()>3)
   throw new IllegalArgumentException("日付・投稿者・タイトル・本文を確認してください。写真は3枚までです。");
  var tags=Arrays.stream(rawTags.split("[,、]",-1)).map(String::strip).filter(t->!t.isEmpty()).distinct().toList();
  if(tags.size()>5||tags.stream().anyMatch(t->t.length()>30))throw new IllegalArgumentException("タグは1つ30文字、5個までです。");
  String fingerprint=hash(List.of(user.toString(),date.toString(),title,body,rawTags),uploads);
  var prior=db.sql("select fingerprint from diary_entries where id=:id").param("id",id).query(String.class).optional();
  if(prior.isPresent()){if(!prior.get().equals(fingerprint))throw new IllegalArgumentException("保存済みの要求です。新しい日記画面から作成してください。");return id;}
  users.requireAuthor(user);if(!uploads.isEmpty())policy.requireImagesEnabled();
  var data=uploads.stream().map(codec::read).toList();var staged=new ArrayList<Photo>();
  try {
   for(var image:data){var photo=new Photo(UUID.randomUUID(),storage.bucket(),UUID.randomUUID()+"."+image.extension(),image.type());staged.add(photo);storage.upload(photo.imageKey(),image);}
   boolean inserted=tx.execute(()->{
    db.sql("select pg_advisory_xact_lock(hashtextextended(:id,0))").param("id",id.toString()).query((r,n)->1).single();
    var existing=db.sql("select fingerprint from diary_entries where id=:id").param("id",id).query(String.class).optional();
    if(existing.isPresent()){if(!existing.get().equals(fingerprint))throw new IllegalArgumentException("同じ要求で異なる内容を保存できません。");return false;}
    db.sql("insert into diary_entries(id,user_id,entry_date,title,body,fingerprint) values(:id,:user,:date,:title,:body,:hash)").param("id",id).param("user",user).param("date",date).param("title",title.strip()).param("body",body.strip()).param("hash",fingerprint).update();
    for(var tag:tags)db.sql("insert into diary_tags values(:id,:tag)").param("id",id).param("tag",tag).update();
    for(int i=0;i<staged.size();i++){var p=staged.get(i);db.sql("insert into diary_photos values(:id,:entry,:pos,:bucket,:key,:type)").param("id",p.id()).param("entry",id).param("pos",i).param("bucket",p.imageBucket()).param("key",p.imageKey()).param("type",p.imageType()).update();}
    return true;
   });
   if(!inserted)discard(staged);
  }catch(RuntimeException failure){try{discard(staged);}catch(RuntimeException secondary){failure.addSuppressed(secondary);}throw failure;}
  return id;
 }
 private void discard(List<Photo> photos){for(var p:photos)cleanup.enqueue(p.imageBucket(),p.imageKey());cleanup.run();}
 private String hash(List<String> input,List<ImageUpload> images){try{var h=java.security.MessageDigest.getInstance("SHA-256");for(var field:input){var bytes=field.getBytes(java.nio.charset.StandardCharsets.UTF_8);h.update(java.nio.ByteBuffer.allocate(4).putInt(bytes.length).array());h.update(bytes);}for(var i:images){h.update(java.nio.ByteBuffer.allocate(4).putInt(i.bytes().length).array());h.update(i.bytes());}return java.util.HexFormat.of().formatHex(h.digest());}catch(Exception e){throw new IllegalStateException(e);}}
}
