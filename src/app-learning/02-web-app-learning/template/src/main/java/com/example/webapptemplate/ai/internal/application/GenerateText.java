package com.example.webapptemplate.ai.internal.application;
import com.example.webapptemplate.ai.*;
import com.example.webapptemplate.platform.*;
import com.example.webapptemplate.settings.FeaturePolicy;
import java.util.*;
public final class GenerateText implements AiText {
 private final OpenAIGateway gateway; private final FeaturePolicy policy; private final ImageCodec codec;
 public GenerateText(OpenAIGateway gateway,FeaturePolicy policy,ImageCodec codec){this.gateway=gateway;this.policy=policy;this.codec=codec;}
 public AiDraftResult generate(UUID id,String instruction,String input,List<ImageUpload> images){
  if(id==null || instruction==null || instruction.isBlank() || instruction.length()>3000 || input==null || input.isBlank() || input.length()>5000 || images==null || images.size()>3)
   throw new IllegalArgumentException("入力は1〜5000文字、画像は3枚までです。");
  AiCheckResult.Status status;
  if(!policy.aiEnabled())status=AiCheckResult.Status.DISABLED;
  else if(!gateway.configured())status=AiCheckResult.Status.UNCONFIGURED;
  else if(!policy.allowsAiModel(gateway.model()))status=AiCheckResult.Status.MODEL_DENIED;
  else {
   if(!images.isEmpty())policy.requireImagesEnabled();
   var data=images.stream().map(codec::read).toList();
   var response=gateway.generateMany(instruction,input,data);
   return new AiDraftResult(id,response.status().name(),gateway.model(),response.text(),response.status().message());
  }
  return new AiDraftResult(id,status.name(),gateway.model(),"",status.message());
 }
}
