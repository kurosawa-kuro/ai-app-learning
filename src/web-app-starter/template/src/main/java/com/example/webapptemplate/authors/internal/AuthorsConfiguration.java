package com.example.webapptemplate.authors.internal;

import com.example.webapptemplate.platform.ImageCleanup;
import com.example.webapptemplate.platform.ImageCodec;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.UnitOfWork;
import com.example.webapptemplate.authors.AuthorOperations;
import com.example.webapptemplate.authors.UserIcons;
import com.example.webapptemplate.authors.internal.application.AuthorService;
import com.example.webapptemplate.authors.internal.application.AuthorStore;
import com.example.webapptemplate.authors.internal.application.IconStore;
import com.example.webapptemplate.authors.internal.application.UserIconService;
import org.springframework.context.annotation.*;
@Configuration
class AuthorsConfiguration {
    @Bean AuthorOperations authorOperations(AuthorStore store, IconStore icons, UnitOfWork tx, ImageCleanup cleanup) { return new AuthorService(store,icons,tx,cleanup); }
    @Bean UserIcons userIcons(AuthorStore authors, IconStore icons, UnitOfWork tx, ImageStore storage, ImageCodec codec, ImageCleanup cleanup) { return new UserIconService(authors,icons,tx,storage,codec,cleanup); }
}
