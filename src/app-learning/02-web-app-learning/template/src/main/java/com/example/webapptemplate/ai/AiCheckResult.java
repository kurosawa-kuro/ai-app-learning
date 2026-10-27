package com.example.webapptemplate.ai;

import java.time.Instant;

public record AiCheckResult(String reference, Status status, String model, Instant checkedAt, long elapsedMillis) {
    public enum Status {
        SUCCESS("Geminiから応答を受け取りました。"),
        DISABLED("AI連携は禁止されています。機能管理で許可して保存してください。"),
        MODEL_DENIED("使用モデルは許可されていません。管理画面の許可モデルを確認してください。外部通信は行っていません。"),
        UNCONFIGURED("接続設定が不足しています。提供者がAPIキーとモデルの設定を確認してください。"),
        BUSY("別の接続確認を実行中です。完了してから確認してください。"),
        AUTHENTICATION("APIキーまたは利用権限を確認してください。"),
        RATE_LIMIT("利用上限に達しています。利用枠を確認し、時間を置いて再試行してください。"),
        MODEL_UNAVAILABLE("指定モデルを利用できません。モデル名と利用可能なモデルを確認してください。"),
        TIMEOUT("応答待ちが時間切れになりました。処理された可能性があります。自動再送はしていません。"),
        CONNECTION("通信を完了できませんでした。処理された可能性があります。接続状態を確認してください。"),
        INVALID_RESPONSE("応答はありましたが、有効なテキストを確認できませんでした。"),
        REJECTED("確認リクエストが拒否されました。接続設定を確認してください。"),
        UNAVAILABLE("Geminiで一時的な障害が発生しています。時間を置いて確認してください。");
        private final String message;
        Status(String message) { this.message = message; }
        public String message() { return message; }
    }
    public boolean success() { return status == Status.SUCCESS; }
    public String message() { return status.message(); }
}
