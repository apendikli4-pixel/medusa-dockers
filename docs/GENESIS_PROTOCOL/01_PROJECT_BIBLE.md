# � PROJECT BIBLE: The Genesis Architecture

**Bu belge, PROJECT AYNA'nın teknik anayasasıdır. Buradaki kurallar çiğnendiğinde sistem çöker.**

## 1. Altın Kurallar (The Golden Rules)
1.  **Volume İzolasyonu (Ironclad Rule)**:
    * `node_modules`, `.medusa`, `dist` klasörleri ASLA host makineden Docker içine mount edilmemelidir.
    * Docker içinde oluşturulan dosyalar Docker içinde kalır. Host sadece `src` ve konfigürasyon dosyalarını verir.
2.  **Modül İsimlendirme (Snake Case Law)**:
    * Tüm modül klasörleri ve ID'leri `snake_case` olmalıdır. Örn: `content_engine` (ASLA `contentEngine` veya `ContentEngine` değil).
3.  **DML Bütünlüğü (Data Modeling Law)**:
    * Medusa v2'de `@Entity` (TypeORM) kullanılmaz. Sadece `model.define()` (DML) kullanılır.
    * İlişkiler (Relationships) `model.hasOne`, `model.hasMany` ile tanımlanır.

## 2. Docker Stratejisi
* **Production-Like Dev**: `medusa develop` yerine `medusa start` + `yarn build` döngüsü kullanılır.
* **Watcher Yok**: İzleyici (Watcher) Windows dosya sisteminde kilitlenmelere ("Locking") ve bellek şişmesine ("ENOMEM") neden olur. Manuel Build en güvenlisidir.
* **Memory Limit**: Konteyner 4GB RAM ile sınırlandırılmıştır.

## 3. Workflow Disiplini
* **Step Idempotency**: Her workflow adımı (`createStep`), hata anında kendini geri alacak (`compensation`) mantığa sahip olmalıdır.
* **Sovereign API**: API rotaları (`route.ts`) iş mantığı içermez, sadece Workflow tetikler.

## 4. Admin UI Geliştirme (Zero-Risk)
* Asla Backend çalışırken kod yazıp otomatik yenileme bekleme.
* Kod Yaz -> Manuel Build Al -> Restart Et.
* Medusa v2 Admin SDK (`defineRouteConfig`) kullan.
