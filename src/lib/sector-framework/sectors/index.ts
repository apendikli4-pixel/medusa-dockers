/**
 * Sektör Yükleyici (Side-effect Import)
 *
 * Bu dosya import edildiği anda tüm sektör dosyaları yüklenir ve her biri
 * kendini SectorRegistry'ye kaydeder. Uygulamanın bir yerinden:
 *
 *   import "./lib/sector-framework/sectors"
 *
 * çağrıldığında 6 sektör de kayıt defterine eklenmiş olur.
 *
 * Yeni sektör eklemek için:
 *   1. sectors/<yeni-sektor>.ts dosyasını oluştur
 *   2. SectorRegistry.register(config) çağır (sondaki satır)
 *   3. Bu dosyaya import satırını ekle
 *   4. SectorCode tip birliğine (../types.ts) ve tenant VALID_SECTORS'a ekle
 */

import "./retail"
import "./horeca"
import "./b2b"
import "./fashion"
import "./vape"
import "./pool"
