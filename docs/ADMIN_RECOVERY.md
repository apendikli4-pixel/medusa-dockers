# Admin Recovery — Doğru Yöntem

Eski projede iki ayrı "acil parola sıfırlama" mekanizması vardı:

- `src/api/emergency-reset/route.ts` — auth gerektirmeyen HTTP endpoint (kritik güvenlik açığı)
- `src/scripts/reset-admin-password.ts` — sabit kodlanmış parola (`Admin123!`) ile DB'yi doğrudan değiştiren script

Her ikisi de güvenlik nedeniyle silindi. Bu doküman doğru alternatifi tanımlar.

## Yeni admin kullanıcı oluşturma (önerilen)

Medusa V2 resmi CLI komutu vardır:

```powershell
docker exec -it medusa_server_core_v2 npx medusa user -e "admin@ayna.com" -p "GUCLU_RASTGELE_BIR_PAROLA"
```

Parola **komut satırında plaintext** olarak verilir; shell history'sini temizleyin:

```powershell
# PowerShell
Clear-History
Remove-Item (Get-PSReadLineOption).HistorySavePath -Force
```

## Mevcut admin parolasını değiştirme

Admin panelinden (`/app`) giriş yaptıktan sonra Settings → Users üzerinden değiştirin.

Şifreyi unuttuysanız:

1. **Yeni bir admin kullanıcı oluşturun** (yukarıdaki komut farklı bir e-postayla)
2. Yeni hesapla `/app`'e girin
3. Eski hesabı pasifleştirin veya silin

## ASLA YAPMAYIN

- Parolayı script'in içine veya `.env` dosyasına sabit kodlamayın
- Auth gerektirmeyen "emergency reset" endpoint'i bırakmayın
- DB'yi direkt UPDATE ile değiştirip parola değiştirmeyin (hash formatı sürüm sürüm değişebilir)
- Parolayı paylaşılan kanaldan (Slack, e-posta) iletmeyin — 1Password / Bitwarden / parola yöneticisi kullanın

## Acil durum kurtarma (admin DB'ye bile erişim yok)

1. Postgres'e direkt psql ile bağlanın
2. `user` ve `auth_identity` tablolarını yedekleyin (`pg_dump -t user -t auth_identity ...`)
3. Yeni bir admin'i yukarıdaki CLI ile oluşturun
4. Eski admin'in `auth_identity` kaydını silip yeniden oluşturun (sadece son çare)
