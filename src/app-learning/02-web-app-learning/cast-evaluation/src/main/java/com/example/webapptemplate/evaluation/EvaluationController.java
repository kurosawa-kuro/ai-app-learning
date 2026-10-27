package com.example.webapptemplate.evaluation;
import java.time.*;
import java.util.*;
import java.math.BigDecimal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;
@Controller
public class EvaluationController {
 private final EvaluationService service;
 public EvaluationController(EvaluationService service){this.service=service;}
 @GetMapping("/evaluation") public String show(@RequestParam(defaultValue="")String month,@RequestParam(required=false)UUID edit,Model model){
  var m=month.isBlank()?YearMonth.now():YearMonth.parse(month);var records=service.records(m);
  model.addAttribute("month",m.toString());model.addAttribute("members",service.members());model.addAttribute("records",records);model.addAttribute("results",service.results(m));model.addAttribute("rules",service.rules());
  if(!model.containsAttribute("input")){
   var input=new HashMap<String,String>();input.put("businessDate",LocalDate.now().toString());
   if(edit!=null){var e=records.stream().filter(x->x.id().equals(edit)).findFirst().orElseThrow(()->new IllegalArgumentException("対象月の実績が見つかりません。"));input.put("id",e.id().toString());input.put("memberId",e.memberId().toString());input.put("businessDate",e.businessDate().toString());input.put("version",""+e.version());input.put("drinks",""+e.drinks());input.put("bottles",""+e.bottles());input.put("nominations",""+e.nominations());input.put("accompaniments",""+e.accompaniments());input.put("sales",""+e.sales());}
   model.addAttribute("input",input);
  }
  return "evaluation/index";
 }
 @PostMapping("/evaluation/{operation}") public String save(@PathVariable String operation,@RequestParam Map<String,String> p,Model model,RedirectAttributes flash){
  String month=p.getOrDefault("month",YearMonth.now().toString());
  try {
   switch(operation){
    case "member" -> service.member(uuid(p,"id"),p.get("name"),p.containsKey("active"),number(p,"version"));
    case "record" -> service.record(uuid(p,"id"),uuid(p,"memberId"),LocalDate.parse(p.getOrDefault("businessDate","")),number(p,"drinks"),number(p,"bottles"),number(p,"nominations"),number(p,"accompaniments"),number(p,"sales"),number(p,"version"));
    case "rule" -> service.rule(p.get("category"),new BigDecimal(p.getOrDefault("unit","")),new BigDecimal(p.getOrDefault("points","")),p.containsKey("enabled"),number(p,"version"));
    default -> throw new IllegalArgumentException("操作を確認してください。");
   }
   flash.addFlashAttribute("message","保存しました。");return "redirect:/evaluation?month="+YearMonth.parse(month);
  } catch(IllegalArgumentException|java.time.DateTimeException e){model.addAttribute("error",e instanceof NumberFormatException?"数値を確認してください。":e.getMessage());}
    catch(org.springframework.dao.DataAccessException e){model.addAttribute("error","保存できませんでした。入力を残しています。再試行してください。");}
  model.addAttribute("failedOperation",operation);model.addAttribute("input",p);return show(month,null,model);
 }
 private UUID uuid(Map<String,String> p,String name){String s=p.get(name);return s==null||s.isBlank()?null:UUID.fromString(s);}
 private long number(Map<String,String> p,String name){return Long.parseLong(p.getOrDefault(name,"0"));}
}
