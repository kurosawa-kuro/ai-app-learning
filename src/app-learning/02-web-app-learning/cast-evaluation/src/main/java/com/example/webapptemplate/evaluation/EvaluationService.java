package com.example.webapptemplate.evaluation;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;
import com.example.webapptemplate.platform.MissingEntity;

@Service
public class EvaluationService {
 public record Member(UUID id,String name,boolean active,long version){}
 public record Record(UUID id,UUID memberId,String name,LocalDate businessDate,long drinks,long bottles,long nominations,long accompaniments,long sales,long version){}
 public record Rule(String category,BigDecimal unit,BigDecimal points,boolean enabled,long version){}
 public record Result(UUID id,String name,long drinks,long bottles,long nominations,long accompaniments,long sales,BigDecimal points,long rank){}
 private final JdbcClient db;
 public EvaluationService(JdbcClient db){this.db=db;}
 public List<Member> members(){return db.sql("select * from evaluation_members order by active desc,name,id").query(Member.class).list();}
 public List<Rule> rules(){return db.sql("select * from evaluation_rules order by category").query(Rule.class).list();}
 public List<Record> records(YearMonth month){return db.sql("select r.*,m.name from evaluation_records r join evaluation_members m on m.id=r.member_id where business_date>=:start and business_date<:end order by business_date desc,m.name,r.id").param("start",month.atDay(1)).param("end",month.plusMonths(1).atDay(1)).query(Record.class).list();}
 public void member(UUID id,String name,boolean active,long version){
  if(name==null||name.isBlank()||name.length()>80)throw new IllegalArgumentException("名前は1〜80文字です。");
  if(id==null){db.sql("insert into evaluation_members(id,name) values(:id,:name)").param("id",UUID.randomUUID()).param("name",name.strip()).update();return;}
  if(db.sql("update evaluation_members set name=:name,active=:active,version=version+1 where id=:id and version=:v").param("id",id).param("name",name.strip()).param("active",active).param("v",version).update()!=1)throw new IllegalArgumentException("他の画面で変更されています。読み直して確認してください。");
 }
 public void record(UUID id,UUID member,LocalDate date,long drinks,long bottles,long nominations,long accompaniments,long sales,long version){
  if(member==null||date==null||drinks<0||bottles<0||nominations<0||accompaniments<0||sales<0||drinks>1000000||bottles>1000000||nominations>1000000||accompaniments>1000000||sales>1000000000)throw new IllegalArgumentException("実績は0以上の整数で入力してください。");
  var query=id==null?db.sql("insert into evaluation_records(id,member_id,business_date,drinks,bottles,nominations,accompaniments,sales) select :id,:member,:date,:drinks,:bottles,:nominations,:accompaniments,:sales where exists(select 1 from evaluation_members where id=:member and active)"):
   db.sql("update evaluation_records set member_id=:member,business_date=:date,drinks=:drinks,bottles=:bottles,nominations=:nominations,accompaniments=:accompaniments,sales=:sales,version=version+1 where id=:id and version=:v and (member_id=:member or exists(select 1 from evaluation_members where id=:member and active))").param("v",version);
  try {if(query.param("id",id==null?UUID.randomUUID():id).param("member",member).param("date",date).param("drinks",drinks).param("bottles",bottles).param("nominations",nominations).param("accompaniments",accompaniments).param("sales",sales).update()!=1)throw new IllegalArgumentException("在籍中のメンバーを選ぶか、最新の実績を読み直してください。");}
  catch(org.springframework.dao.DuplicateKeyException e){throw new IllegalArgumentException("同じメンバー・営業日の実績があります。一覧から編集してください。");}
 }
 public void rule(String category,BigDecimal unit,BigDecimal points,boolean enabled,long version){
  if(unit==null||points==null||unit.signum()<=0||unit.compareTo(new BigDecimal("1000000000"))>0||points.signum()<0||points.compareTo(new BigDecimal("1000000"))>0||unit.scale()>2||points.scale()>2)throw new IllegalArgumentException("計算単位は0より大きく、ポイントは0以上、小数2桁までです。");
  if(db.sql("update evaluation_rules set unit=:unit,points=:points,enabled=:enabled,version=version+1 where category=:category and version=:v").param("unit",unit).param("points",points).param("enabled",enabled).param("category",category).param("v",version).update()!=1)throw new IllegalArgumentException("ルールが変更されています。再読込してください。");
 }
 public record Totals(UUID id,String name,long drinks,long bottles,long nominations,long accompaniments,long sales){}
 public List<Result> results(YearMonth month){
  var totals=db.sql("""
   select m.id,m.name,coalesce(sum(r.drinks),0) as drinks,coalesce(sum(r.bottles),0) as bottles,coalesce(sum(r.nominations),0) as nominations,coalesce(sum(r.accompaniments),0) as accompaniments,coalesce(sum(r.sales),0) as sales
   from evaluation_members m left join evaluation_records r on r.member_id=m.id and r.business_date>=:start and r.business_date<:end group by m.id
   """).param("start",month.atDay(1)).param("end",month.plusMonths(1).atDay(1)).query(Totals.class).list();
  var weights=rules().stream().map(q->new com.example.webapptemplate.evaluation.internal.domain.EvaluationScore.Weight(q.category(),q.unit(),q.points(),q.enabled())).toList();
  var scored=new ArrayList<Result>();
  for(var t:totals){var values=Map.of("DRINK",BigDecimal.valueOf(t.drinks()),"BOTTLE",BigDecimal.valueOf(t.bottles()),"NOMINATION",BigDecimal.valueOf(t.nominations()),"ACCOMPANIMENT",BigDecimal.valueOf(t.accompaniments()),"SALES",BigDecimal.valueOf(t.sales()));
   var points=com.example.webapptemplate.evaluation.internal.domain.EvaluationScore.calculate(values,weights);
   scored.add(new Result(t.id(),t.name(),t.drinks(),t.bottles(),t.nominations(),t.accompaniments(),t.sales(),points,0));}
  scored.sort(Comparator.comparing(Result::points).reversed().thenComparing(Comparator.comparingLong(Result::sales).reversed()).thenComparing(Result::name).thenComparing(Result::id));
  var ranked=new ArrayList<Result>();long rank=0;Result previous=null;
  for(int i=0;i<scored.size();i++){var t=scored.get(i);if(previous==null||t.points().compareTo(previous.points())!=0||t.sales()!=previous.sales())rank=i+1;ranked.add(new Result(t.id(),t.name(),t.drinks(),t.bottles(),t.nominations(),t.accompaniments(),t.sales(),t.points(),rank));previous=t;}
  return List.copyOf(ranked);
 }
}
