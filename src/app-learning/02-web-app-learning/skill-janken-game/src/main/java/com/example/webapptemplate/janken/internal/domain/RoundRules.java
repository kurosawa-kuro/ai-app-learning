package com.example.webapptemplate.janken.internal.domain;
import java.util.*;
public final class RoundRules {
 public record Score(String outcome,int points){}
 public static final Map<String,List<String>> AFFINITIES=Map.of("hinoko",List.of("win","lose"),"shizuku",List.of("lose","draw"),"konoha",List.of("win","draw"));
 public static void validate(String character,String hand,String skill){if(!AFFINITIES.containsKey(character)||!AFFINITIES.get(character).contains(skill)||!List.of("rock","scissors","paper").contains(hand))throw new IllegalArgumentException("なかま・スキル・手を選び直してください。");}
 public static Score resolve(String hand,String cpu,String skill){var beats=Map.of("rock","scissors","scissors","paper","paper","rock");if(!beats.containsKey(hand)||!beats.containsKey(cpu)||!List.of("win","lose","draw").contains(skill))throw new IllegalArgumentException("手とスキルを確認してください。");String outcome=hand.equals(cpu)?"draw":beats.get(hand).equals(cpu)?"win":"lose";return new Score(outcome,(outcome.equals("win")?2:1)+(outcome.equals(skill)?1:0));}
 private RoundRules(){}
}
