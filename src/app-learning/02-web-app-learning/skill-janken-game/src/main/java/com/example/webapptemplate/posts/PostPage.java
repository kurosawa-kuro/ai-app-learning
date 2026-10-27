package com.example.webapptemplate.posts;

import java.util.List;

/** One-based page, with a bounded collection rather than the entire feed. */
public record PostPage(List<PostView> items, long number, int size, long total) {
    public PostPage { items = List.copyOf(items); }
    public long totalPages() { return Math.max(1, total / size + (total % size == 0 ? 0 : 1)); }
    public boolean hasPrevious() { return number > 1; }
    public boolean hasNext() { return number < totalPages(); }
    public long firstItem() { return items.isEmpty() ? 0 : (number - 1) * size + 1; }
    public long lastItem() { return items.isEmpty() ? 0 : firstItem() + items.size() - 1; }
}
