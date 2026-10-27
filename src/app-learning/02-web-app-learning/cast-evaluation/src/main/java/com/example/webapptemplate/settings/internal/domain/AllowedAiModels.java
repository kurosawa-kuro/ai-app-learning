package com.example.webapptemplate.settings.internal.domain;

import java.util.LinkedHashSet;
import java.util.List;

/** Exact model identifiers only; an empty list means deny all. */
public record AllowedAiModels(List<String> values) {
    public AllowedAiModels { values=List.copyOf(values); }
    public static AllowedAiModels parse(String input) {
        if(input==null || input.length()>2000)
            throw new IllegalArgumentException("許可モデルは合計2000文字以内で入力してください。");
        var models=new LinkedHashSet<String>();
        for(String line:input.split("\\R")) {
            String model=line.strip();
            if(model.isEmpty()) continue;
            if(!model.matches("gemini-[a-z0-9.-]{1,80}"))
                throw new IllegalArgumentException("モデルIDを1行に1つ入力してください。URL・空白・ワイルドカードは使えません。");
            models.add(model);
        }
        if(models.size()>20) throw new IllegalArgumentException("許可モデルは20件以内で指定してください。");
        return new AllowedAiModels(List.copyOf(models));
    }
    public String stored() { return String.join("\n",values); }
}
