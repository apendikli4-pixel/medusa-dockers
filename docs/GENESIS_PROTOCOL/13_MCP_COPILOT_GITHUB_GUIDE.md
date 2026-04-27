# MCP + GitHub Copilot Entegrasyon Rehberi

Bu dokuman, VS Code icinde GitHub Copilot'u MCP (Model Context Protocol) ile GitHub araclariyla calistirmak icin hazirlandi.

## Hedef

- Copilot'un GitHub issue'larini listelemesi ve guncellemesi
- Copilot'un repository arastirmasi yapmasi
- Copilot'un pull request olusturmasi

## 1) Workspace MCP kurulumu

Bu repo icin MCP ayari `/.vscode/mcp.json` dosyasina eklendi:

```json
{
  "servers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

Bu ayar, GitHub MCP server'ini workspace seviyesinde tanimlar.

## 2) VS Code tarafinda aktive etme

1. Command Palette ac: `Ctrl+Shift+P`
2. `MCP: List Servers` calistir
3. `github` sunucusunu sec ve `Start` et
4. Ilk calistirmada trust penceresini onayla
5. Gerekirse GitHub hesabinda yetkilendirmeyi tamamla

Not: MCP server enable/disable durumu `mcp.json` disinda tutulur.

## 3) Copilot Chat'te kullanim ornekleri

Asagidaki promptlari dogrudan kullanabilirsin:

- `org/repo reposundaki acik issue'lari listele, oncelik etiketi olmayanlari bul.`
- `org/repo icinde payment timeout ile ilgili issue ve PR'lari ara, son 30 gundeki trendi ozetle.`
- `org/repo icin fix/mcp-hardening branch'inden main'e bir PR olustur. Baslik ve aciklamayi conventional commit formatinda yaz.`
- `Issue #123'u incele, yeniden uretim adimlarini ozetle ve teknik aksiyon maddeleri cikar.`

## 4) Gerekli izinler

Kurumsal policy varsa MCP erisimi org tarafindan kisitlanabilir. Su kontrolleri yap:

- GitHub Copilot lisansi aktif olmali
- VS Code'da Copilot extension guncel olmali
- GitHub auth baglantisi acik olmali
- Org policy MCP server erisimini engellememeli

## 5) Sorun giderme

- `MCP: List Servers` -> `github` gorunmuyorsa: `/.vscode/mcp.json` JSON syntax kontrol et
- Server start olmuyorsa: `MCP: List Servers` -> `Show Output` ile logu incele
- Chat tool cagrisi gelmiyorsa: Chat icindeki `Configure Tools` panelinde GitHub tools acik mi kontrol et
- Yetki hatasi aliyorsan: GitHub auth cikis-giris yap, org SSO/policy tarafini kontrol et

## 6) Guvenlik notlari

- MCP server'a sadece guvendigin kaynaklari ekle
- Workspace `mcp.json` dosyasina gizli key veya token hardcode etme
- Hassas islemlerde (issue/PR yazma, merge) tool confirmation adimini dikkatle onayla
