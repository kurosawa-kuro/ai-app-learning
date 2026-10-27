package com.example.webapptemplate;
import com.example.webapptemplate.evaluation.EvaluationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.jdbc.core.simple.JdbcClient;
import java.time.*;
import java.math.BigDecimal;
import static org.assertj.core.api.Assertions.*;
@SpringBootTest @Transactional
class EvaluationTests {
 @Autowired EvaluationService service;
 @Autowired JdbcClient db;
 @Test void aggregatesBeforeFloorAndRanksTiesAndKeepsHistoricalMembers(){
  service.member(null,"評価A",true,0);service.member(null,"評価B",true,0);
  var a=service.members().stream().filter(m->m.name().equals("評価A")).findFirst().orElseThrow();
  var b=service.members().stream().filter(m->m.name().equals("評価B")).findFirst().orElseThrow();
  service.record(null,a.id(),LocalDate.of(2026,1,1),1,0,0,0,600,0);
  service.record(null,a.id(),LocalDate.of(2026,1,2),1,0,0,0,600,0);
  service.record(null,b.id(),LocalDate.of(2026,1,1),2,0,0,0,1200,0);
  var rule=service.rules().stream().filter(r->r.category().equals("SALES")).findFirst().orElseThrow();
  service.rule("SALES",new BigDecimal("1000"),BigDecimal.ONE,true,rule.version());
  var rows=service.results(YearMonth.of(2026,1));
  var ra=rows.stream().filter(x->x.id().equals(a.id())).findFirst().orElseThrow();
  var rb=rows.stream().filter(x->x.id().equals(b.id())).findFirst().orElseThrow();
  assertThat(ra.points()).isEqualByComparingTo("3");assertThat(ra.rank()).isEqualTo(rb.rank());
  assertThat(service.results(YearMonth.of(2026,2))).allMatch(x->x.sales()==0);
  service.member(a.id(),"評価A改名",false,a.version());
  assertThat(service.results(YearMonth.of(2026,1))).anyMatch(x->x.name().equals("評価A改名")&&x.sales()==1200);
  assertThatThrownBy(()->service.record(null,a.id(),LocalDate.of(2026,1,3),1,0,0,0,0,0)).isInstanceOf(IllegalArgumentException.class);
 }
 @Test void preventsDuplicateAndStaleEdits(){
  service.member(null,"重複確認",true,0);var m=service.members().stream().filter(x->x.name().equals("重複確認")).findFirst().orElseThrow();
  var date=LocalDate.of(2026,3,1);service.record(null,m.id(),date,1,0,0,0,0,0);
  var r=service.records(YearMonth.of(2026,3)).stream().filter(x->x.memberId().equals(m.id())).findFirst().orElseThrow();
  service.record(r.id(),m.id(),date,2,0,0,0,0,r.version());
  assertThatThrownBy(()->service.record(r.id(),m.id(),date,3,0,0,0,0,r.version())).isInstanceOf(IllegalArgumentException.class);
  // Duplicate SQL aborts a PostgreSQL transaction, so it is intentionally the final assertion.
  assertThatThrownBy(()->service.record(null,m.id(),date,1,0,0,0,0,0)).isInstanceOf(IllegalArgumentException.class);
 }
}
