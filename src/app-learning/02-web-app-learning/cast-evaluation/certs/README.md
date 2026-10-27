# Supabaseの公開CA証明書

`prod-ca-2021.crt` は秘密鍵を含まない公開CA証明書。Session poolerへのJDBC接続で、サーバー証明書とホスト名を検証するために使用する。

- 取得日：2026-10-27
- [取得元（Supabase配布先）](https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt)
- 配布URLの根拠：[公式Dashboardの設定](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json) の `ssl:certificate_url`（環境は `prod`）。HTTPSで取得した。
- Subject / Issuer：`CN=Supabase Root 2021 CA, O=Supabase Inc, L=New Castle, ST=Delware, C=US`
- 証明書のSHA-256フィンガープリント：`80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`
- 有効期限：2031-04-26

更新時はDashboardのDatabase SettingsにあるSSL Certificateの配布先を確認し、接続テストを再実行する。証明書エラー時に検証を無効化する設定へ切り替えない。
