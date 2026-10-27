package com.example.webapptemplate.posts.internal.adapter.web;
import com.example.webapptemplate.posts.PostOperations;
import com.example.webapptemplate.platform.ImageStore;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
@RestController
public class PostImageController {
 private final PostOperations service; private final ImageStore storage;
 public PostImageController(PostOperations service,ImageStore storage) {this.service=service;this.storage=storage;}
 @GetMapping("/posts/{id}/image")
 public ResponseEntity<byte[]> image(@PathVariable java.util.UUID id) {
  var post=service.post(id);
  if(!storage.configured() || post.imageKey()==null) return ResponseEntity.notFound().build();
  try {return ResponseEntity.ok().cacheControl(CacheControl.noStore()).contentType(MediaType.parseMediaType(post.imageType())).body(storage.download(post.imageBucket(),post.imageKey()));}
  catch(com.example.webapptemplate.platform.MissingImage missing) {return ResponseEntity.notFound().build();}
  catch(IllegalStateException unavailable) {return ResponseEntity.status(503).build();}
 }
}
