package com.example.webapptemplate;

import com.example.webapptemplate.platform.ImageCleanup;
import com.example.webapptemplate.platform.ImageStore;
import com.example.webapptemplate.platform.internal.adapter.persistence.JdbcCleanupQueue;
import com.example.webapptemplate.platform.internal.application.RetryImageCleanup;
import com.example.webapptemplate.authors.internal.adapter.persistence.JdbcIconStore;
import com.example.webapptemplate.posts.internal.adapter.persistence.JdbcPostStore;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.simple.JdbcClient;
import java.util.List;
final class TestInfrastructure {
    static ImageCleanup cleanup(JdbcTemplate jdbc, ImageStore storage) {
        return new RetryImageCleanup(new JdbcCleanupQueue(jdbc), storage,
            List.of(new JdbcPostStore(JdbcClient.create(jdbc)), new JdbcIconStore(jdbc)));
    }
}
