package com.example.webapptemplate.bootstrap.internal.adapter.persistence;
import com.example.webapptemplate.platform.ImageData;

import java.awt.Color;
import java.awt.Font;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;
import javax.imageio.ImageIO;

/** Fictional content only. Stable identifiers make additive seeding repeatable. */
public final class SeedFixtures {
    public record Author(UUID id, String name) {}
    public record Entry(UUID id, UUID author, String title, String body, int daysAgo, String image) {}
    public static UUID id(String value) {
        return UUID.nameUUIDFromBytes(("web-app-template:demo:v1:" + value).getBytes(StandardCharsets.UTF_8));
    }
    static final List<Author> AUTHORS = List.of(
        new Author(id("author:haruka"), "青木 はるか"),
        new Author(id("author:ren"), "佐藤 蓮"),
        new Author(id("author:mio"), "森 美緒"));

    private static Entry entry(int number, int author, String title, String body, int daysAgo, String image) {
        return new Entry(id("post:" + number), AUTHORS.get(author).id(), title, body, daysAgo, image);
    }
    static final List<Entry> ENTRIES = List.of(
        entry(1, 0, "今週は「ひとつ動かす」から始める", """
            やりたいことを並べたら、思ったよりたくさんありました。
            今週は欲張らず、「気づいたことを一件残して、あとで読み返せる」までを目標にします。

            今日できたこと
            ・新しい投稿を作った
            ・一覧から自分の投稿を見つけた
            ・スマホでも文章を読み返せた

            次は、AIに「読みやすく整理したい」と相談してみます。まず一つ、自分の生活で使えるものになれば十分。
            """, 0, "focus"),
        entry(2, 1, "朝の準備を、3つのチェックに", """
            開店前に確認することを「備品・予約・引き継ぎ」の3つに整理しました。
            明日はこの順番で試し、確認が抜けたところだけ追記します。
            """, 1, null),
        entry(3, 2, "AIへの頼み方を変えたら、確認しやすくなった", """
            最初は「使いやすくして」とだけ頼んでいました。返ってきた案は立派でも、どこから試すか迷ってしまいました。

            今回は、困っている場面と、できたと判断する条件を一緒に伝えました。

            伝えたこと
            「スマホで投稿を書くとき、入力の途中で投稿者を変えたい。書いていた文章は消えないようにしてほしい」

            確認したこと
            1. タイトルと本文を書く。
            2. 投稿者を変更する。
            3. 入力した文章が残っていることを確認する。
            4. 保存し、詳細画面の投稿者が合っているか見る。

            操作の順番にすると、自分でも結果を確かめられました。「何を変えるか」と同じくらい、「何を試すか」が大切だと感じます。

            次に困ったら
            エラーが出た画面だけでなく、その直前に何をしたかもメモしてから相談します。一度に直すことを増やさず、一つずつ試していきます。
            """, 2, null),
        entry(4, 1, "引き継ぎメモの置き場所をそろえる", """
            紙・チャット・口頭に分かれていた引き継ぎを、一か所で確認できるようにしたい。
            まずは架空の作業を使って、未着手・確認中・完了の3列で整理してみました。

            ここで扱うのは検討用のサンプルです。実際の顧客情報やスタッフ情報は含めていません。
            次の確認では、「担当者が変わっても次にすることが分かるか」を見ます。
            """, 3, "board"),
        entry(5, 0, "雨の日に見つけた、小さな楽しみ", """
            いつもの道を少し遠回りして、静かな場所で本を読みました。
            写真がなくても、その日の気持ちを一行残すだけで、あとから思い出せるのがいいですね。
            """, 4, null),
        entry(6, 2, "英語で一文だけ、今日のことを書く", """
            Today I tried something new.

            今日は、新しいことを一つ試した。
            長い文章にしようとせず、言いたいことを一文にしました。AIには別の表現を一つだけ提案してもらい、声に出して比べてみます。
            """, 5, null),
        entry(7, 1, "集計の前に、入力のルールを決める", """
            同じ品物でも名前の書き方が違うと、集計で別の項目になってしまう。
            今日は機能を増やす前に、「日付・品名・個数」の入力例をそろえました。

            確認用の例
            りんご：3個
            みかん：5個
            りんご：2個

            期待する結果は、りんご5個・みかん5個。小さな例で答えを確かめてから、次へ進みます。
            """, 6, null),
        entry(8, 0, "最初の記録", "一つ投稿できました。次は、自分が残したいことを書いてみます。", 7, null),
        entry(9, 0, "週末にやりたいことを三つだけ", "散歩、本を読む、部屋を少し片づける。全部できなくても、できたことを一つ記録します。", 8, null),
        entry(10, 1, "チェックリストを使って引き継ぐ", "説明だけでなく、確認できる項目を残しました。次の担当者にも試してもらい、分かりにくい言葉を直します。", 9, null),
        entry(11, 2, "分からなかった言葉を自分の例に", "新しい言葉を覚えるときは、身近な出来事で一文作ってみます。AIの説明を読んだ後、自分の例が合っているか確認しました。", 10, null),
        entry(12, 2, "過去の記録を読み返す", "前のページに残したメモを読み返すと、小さな変化が見えました。次に試したいことも、一つだけ書き足しておきます。", 11, null));

    /** Code-drawn sample attachments; no external service, personal data or licensed photos. */
    public static ImageData image(String kind) {
        var canvas = new BufferedImage(1200, 760, BufferedImage.TYPE_INT_RGB);
        var g = canvas.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
        g.setColor(new Color(242, 244, 235)); g.fillRect(0, 0, 1200, 760);
        g.setColor(new Color(29, 55, 48));
        g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 22)); g.drawString("LEARNING NOTES  /  SAMPLE", 72, 85);
        g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 58));
        g.drawString(kind.equals("focus") ? "One small step at a time." : "Make the next step clear.", 72, 180);
        g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 25));
        g.drawString(kind.equals("focus") ? "Try. Check. Keep what works." : "A simple handover board for a fictional team.", 72, 235);
        String[] labels = kind.equals("focus") ? new String[]{"TRY", "CHECK", "REFLECT"} : new String[]{"TO DO", "IN REVIEW", "DONE"};
        String[] lines = kind.equals("focus") ? new String[]{"Write one note", "Read it on mobile", "Choose what is next"} : new String[]{"Check supplies", "Review the list", "Share the update"};
        for (int i = 0; i < 3; i++) {
            int x = 72 + i * 360;
            g.setColor(i == 2 ? new Color(205, 230, 187) : Color.WHITE);
            g.fillRoundRect(x, 320, 336, 300, 24, 24);
            g.setColor(new Color(29, 55, 48));
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 20)); g.drawString(labels[i], x + 28, 369);
            g.setFont(new Font(Font.SANS_SERIF, Font.BOLD, 72)); g.drawString("0" + (i + 1), x + 28, 477);
            g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 23)); g.drawString(lines[i], x + 28, 565);
        }
        g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 19)); g.drawString("Fictional example / No real customer or personal data", 72, 700);
        g.dispose();
        try {
            var output = new ByteArrayOutputStream();
            ImageIO.write(canvas, "png", output);
            return new ImageData(output.toByteArray(), "image/png", "png");
        } catch (IOException e) { throw new IllegalStateException("Could not generate seed image."); }
    }
    private SeedFixtures() {}
}
