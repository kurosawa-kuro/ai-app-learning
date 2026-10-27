package com.example.webapptemplate.evaluation.internal.domain;
import java.math.*;
import java.util.*;
/** Score monthly totals, never round each day's sales independently. */
public final class EvaluationScore {
 public record Weight(String category,BigDecimal unit,BigDecimal points,boolean enabled){}
 public static BigDecimal calculate(Map<String,BigDecimal> totals,List<Weight> rules){
  BigDecimal result=BigDecimal.ZERO;
  for(var rule:rules)if(rule.enabled()){
   BigDecimal quantity=totals.getOrDefault(rule.category(),BigDecimal.ZERO);
   BigDecimal part=rule.category().equals("SALES")?quantity.divide(rule.unit(),0,RoundingMode.FLOOR).multiply(rule.points()):quantity.multiply(rule.points()).divide(rule.unit(),12,RoundingMode.HALF_UP);
   result=result.add(part);
  }
  return result;
 }
 private EvaluationScore(){}
}
