package com.example.webapptemplate.ai.internal.adapter.openai;
import com.example.webapptemplate.ai.internal.application.OpenAIGateway;
import com.example.webapptemplate.ai.AiCheckResult.Status;
import com.example.webapptemplate.platform.ImageData;
import java.util.List;
/** Fixed, visibly labelled teaching fixtures. Never calls a provider. */
public final class DemoOpenAIGateway implements OpenAIGateway {
 private final String model;
 public DemoOpenAIGateway(String model){this.model=model;}
 public boolean configured(){return true;} public String model(){return model;} public Status probe(){return Status.SUCCESS;}
 public Generated generate(String instruction,String input,ImageData image){return generateMany(instruction,input,image==null?List.of():List.of(image));}
 public Generated generateMany(String instruction,String input,List<ImageData> images){
  String text=instruction.contains("ENGLISH_GRADE")?"伝えたい内容が分かります。I enjoyed the walk. のように過去形をそろえると、さらに自然になります。":
   instruction.contains("ENGLISH_CHAT")?"That sounds lovely! What did you enjoy most today?":
   instruction.contains("ENGLISH_REFLECT")?"今日使った表現を一つ選び、別の出来事で一文作ってみましょう。":
   instruction.contains("JANKEN_LINE")?"次の一手、いっしょに考えよう！":
   "今日は、身近な景色を写真に残した。少し立ち止まると、いつもと違う発見があった。自分の言葉で、この日の気持ちを書き足しておこう。";
  return new Generated(Status.SUCCESS,text);
 }
}
