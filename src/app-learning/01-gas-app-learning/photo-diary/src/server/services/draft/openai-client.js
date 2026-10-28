/** OpenAI Responses API。キー・生のエラーを返さず、自動再送しない。 */
const OpenAIClient = {
  generateText({model, text, maxOutputTokens = 256, maxChars = 1000, schema, images = []}) {
    const started = Date.now();
    const fail = (code, httpStatus) => ({ok:false, code, ...(httpStatus ? {httpStatus}:{}), elapsedMs:Date.now()-started});
    const key = IntegrationSettings.openaiApiKey();
    if (!key) return fail("missing_api_key");
    if (!/^gpt-[a-z0-9.-]+$/.test(model)) return fail("invalid_model");
    // 入力スキーマを変更せず、ネストしたobjectもstrict出力にする。
    const strictSchema = (value) => {
      if (Array.isArray(value)) return value.map(strictSchema);
      if (!value || typeof value !== "object") return value;
      const out = {};
      Object.keys(value).forEach(k => {out[k] = strictSchema(value[k]);});
      if (out.type === "object") {out.additionalProperties = false; out.required = Object.keys(out.properties || {});}
      return out;
    };
    let response;
    try {
      response = UrlFetchApp.fetch("https://api.openai.com/v1/responses", {
        method:"post", contentType:"application/json",
        headers:{Authorization:"Bearer " + key},
        payload:JSON.stringify({model, store:false, max_output_tokens:maxOutputTokens,
          input:[{role:"user",content:[{type:"input_text",text},...images.map(image=>({type:"input_image",image_url:"data:"+image.mimeType+";base64,"+image.base64,detail:"auto"}))]}],
          ...(schema ? {text:{format:{type:"json_schema",name:"learning_result",strict:true,schema:strictSchema(schema)}}}: {})}),
        muteHttpExceptions:true, followRedirects:false,
      });
    } catch (_) {return fail("transport_or_permission_error");}
    const status = response.getResponseCode();
    if (status !== 200) return fail(({400:"invalid_request_or_key",401:"authentication_error",403:"permission_denied",404:"model_not_found",429:"quota_exceeded"})[status] || (status>=500?"service_unavailable":"http_error"),status);
    let body;
    try {body=JSON.parse(response.getContentText());} catch (_) {return fail("invalid_response");}
    if (!body || typeof body !== "object") return fail("invalid_response");
    if (body.status !== "completed") return fail("incomplete_or_blocked_response");
    const parts = (Array.isArray(body.output)?body.output:[]).filter(x=>x && x.type==="message").flatMap(x=>Array.isArray(x.content)?x.content:[]);
    if(parts.some(x=>x.type==="refusal"))return fail("blocked_response");
    const output=parts.filter(x=>x.type==="output_text"&&typeof x.text==="string").map(x=>x.text).join("").trim();
    if(!output)return fail("empty_response");
    if(output.length>maxChars)return fail("response_too_long");
    const usage={};
    const names={input_tokens:"promptTokenCount",output_tokens:"candidatesTokenCount",total_tokens:"totalTokenCount"};
    Object.keys(names).forEach(name=>{const v=body.usage&&body.usage[name];if(Number.isInteger(v)&&v>=0)usage[names[name]]=v;});
    return {ok:true,code:"generation_succeeded",model,text:output.split(key).join("[REDACTED]"),usage,elapsedMs:Date.now()-started};
  },
};
