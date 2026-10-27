package com.example.webapptemplate.posts.internal;

import com.example.webapptemplate.platform.*;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.UnitOfWork;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.posts.PostOperations;
import com.example.webapptemplate.settings.FeaturePolicy;
import com.example.webapptemplate.posts.internal.application.PostService;
import com.example.webapptemplate.posts.internal.application.PostStore;
import org.springframework.context.annotation.*;
@Configuration
class PostsConfiguration {
    @Bean PostOperations postOperations(PostStore store, ImageStore storage, ImageCodec codec, UnitOfWork tx, AuthorOperations authors, FeaturePolicy policy, ImageCleanup cleanup, AuditTrail audit) { return new PostService(store,storage,codec,tx,authors,policy,cleanup,audit); }
}
