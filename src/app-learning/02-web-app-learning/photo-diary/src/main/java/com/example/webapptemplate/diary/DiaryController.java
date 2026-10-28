package com.example.webapptemplate.diary;
import com.example.webapptemplate.ai.*;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.platform.*;
import java.time.LocalDate;
import java.util.*;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.*;
@Controller
public class DiaryController {
 private final DiaryService service;private final AuthorOperations users;private final ImageStore storage;private final AiText ai;
 public DiaryController(DiaryService service,AuthorOperations users,ImageStore storage,AiText ai){this.service=service;this.users=users;this.storage=storage;this.ai=ai;}
 @GetMapping("/diary") public String list(@RequestParam(defaultValue="")String tag,@RequestParam(defaultValue="1")long page,Model model){var result=service.page(tag,page);model.addAttribute("diaryPage",result);model.addAttribute("tags",service.tags());model.addAttribute("tag",result.selectedTagIds().stream().map(UUID::toString).collect(java.util.stream.Collectors.joining(",")));model.addAttribute("selectedTags",result.selectedTagIds());return "diary/list";}
 @GetMapping("/diary/new") public String form(Model model){model.addAttribute("tags",service.tags());model.addAttribute("authors",users.choices());model.addAttribute("today",LocalDate.now());model.addAttribute("requestId",UUID.randomUUID());return "diary/form";}
 @GetMapping("/diary/{id}") public String detail(@PathVariable UUID id,Model model){model.addAttribute("entry",service.entry(id));model.addAttribute("photos",service.photos(id));return "diary/detail";}
 @GetMapping("/admin/tags") public String tags(Model model){model.addAttribute("catalog",service.tagCatalog());return "diary/tags";}
 @PostMapping("/admin/tags") public String manageTag(@RequestParam String action,@RequestParam(required=false) UUID id,@RequestParam(defaultValue="0") long version,@RequestParam(defaultValue="") String name,Model model){
  try{switch(action){case "add" -> service.addTag(name);case "rename" -> service.renameTag(id,version,name);case "delete" -> service.deleteTag(id,version);default -> throw new IllegalArgumentException("操作を確認してください。");}model.addAttribute("success","タグを更新しました。");}
  catch(IllegalArgumentException e){model.addAttribute("error",e.getMessage());model.addAttribute("failedId",id);model.addAttribute("inputName",name);model.addAttribute("failedAction",action);}
  return tags(model);
 }
 @PostMapping("/diary") @ResponseBody public ResponseEntity<?> save(@RequestParam UUID requestId,@RequestParam UUID userId,@RequestParam LocalDate entryDate,@RequestParam String title,@RequestParam String body,@RequestParam(defaultValue="")String tags,@RequestParam(required=false)List<MultipartFile> photos){
  try {var id=service.save(requestId,userId,entryDate,title,body,tags,uploads(photos));return ResponseEntity.ok(Map.of("redirect","/diary/"+id));}
  catch(IllegalArgumentException|IllegalStateException failure){return ResponseEntity.unprocessableContent().body(Map.of("error",failure.getMessage()));}
  catch(org.springframework.dao.DataAccessException failure){return ResponseEntity.status(503).body(Map.of("error","保存できませんでした。入力と画像を残して再試行できます。"));}
 }
 @PostMapping("/api/diary/draft") @ResponseBody public ResponseEntity<?> draft(@RequestParam UUID requestId,@RequestParam String material,@RequestParam(defaultValue="")String tags,@RequestParam(required=false)List<MultipartFile> photos,HttpSession session){
  synchronized(session){
   var previous=(AiDraftResult)session.getAttribute("diaryDraft");
   if(previous!=null&&previous.requestId().equals(requestId))return ResponseEntity.ok(previous);
   try {var result=ai.generate(requestId,"DIARY: 写真と素材から短い日本語の日記を作成。写真にない事実を足さず、本文だけ返す。",material+"\nタグ："+service.tagNames(tags),uploads(photos));session.setAttribute("diaryDraft",result);return ResponseEntity.ok(result);}
   catch(IllegalArgumentException|IllegalStateException failure){return ResponseEntity.badRequest().body(Map.of("error",failure.getMessage()));}
  }
 }
 @GetMapping("/diary/photos/{id}") @ResponseBody public ResponseEntity<byte[]> photo(@PathVariable UUID id){var p=service.photo(id);try{return ResponseEntity.ok().contentType(MediaType.parseMediaType(p.imageType())).cacheControl(CacheControl.noStore()).body(storage.download(p.imageBucket(),p.imageKey()));}catch(MissingImage e){return ResponseEntity.notFound().build();}catch(IllegalStateException e){return ResponseEntity.status(503).build();}}
 private List<ImageUpload> uploads(List<MultipartFile> photos){return photos==null?List.of():photos.stream().filter(p->!p.isEmpty()).map(Uploads::from).toList();}
}
