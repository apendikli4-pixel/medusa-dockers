/**
 * SEKTÖR KATALOGLARI — Deterministik toplu-yükleme verisi.
 *
 * Ayna admin asistanı "havuzculuğun tüm kategorilerini ve ürünlerini ekle" gibi
 * TOPLU bir istek aldığında, modelin tüm sektör taksonomisini kafasından üretmesi
 * güvenilmez (eksik/uydurma). Bunun yerine `seed_sector_catalog` aracı buradaki
 * küratörlü katalogu `autoStoreGeneratorWorkflow`'a basar → her seferinde EKSİKSİZ.
 *
 * Yeni sektör eklemek: SECTOR_CATALOGS'a yeni bir anahtar ekle. Ürünlerin
 * `category_name` alanı, aynı sektördeki bir kategori `name`'i ile BİREBİR eşleşmeli
 * (workflow eşleştirmeyi ada göre yapar). Fiyatlar TRY cinsinden, ortalama piyasa.
 */

export type CatalogCategory = { name: string; description: string }
export type CatalogProduct = {
    title: string
    description: string
    category_name: string
    price: number
}
export type SectorCatalog = {
    concept_name: string
    categories: CatalogCategory[]
    products: CatalogProduct[]
}

const POOL_CATALOG: SectorCatalog = {
    concept_name: "Havuzculuk Ürünleri Kataloğu",
    categories: [
        { name: "Havuz Kimyasalları", description: "Klor, pH dengeleyici, şoklama ve alg önleyici ürünlerle havuz suyunun hijyenini ve berraklığını koruyun." },
        { name: "Havuz Temizlik Ekipmanları", description: "Robot süpürgeler, yaprak toplama ağları, fırçalar ve teleskopik saplarla havuz yüzeyini ve tabanını zahmetsizce temizleyin." },
        { name: "Havuz Pompaları", description: "Sessiz ve enerji verimli sirkülasyon pompalarıyla havuz suyunu sürekli dolaşımda tutun." },
        { name: "Havuz Filtreleri", description: "Kum, kartuş ve diatomit filtre sistemleriyle suyu kristal berraklığında filtreleyin." },
        { name: "Havuz Isıtma Sistemleri", description: "Isı pompaları, güneş kollektörleri ve eşanjörlerle havuz sezonunu uzatın." },
        { name: "Havuz Aydınlatma", description: "LED havuz projektörleri ve RGB sistemlerle güvenli ve etkileyici gece aydınlatması." },
        { name: "Havuz Kaplama ve Malzeme", description: "Liner membran, seramik, mozaik ve derz dolgularıyla dayanıklı havuz yüzeyleri." },
        { name: "Havuz Güvenlik Ürünleri", description: "Havuz örtüleri, çocuk güvenlik çitleri ve alarm sistemleriyle güvenliği ön planda tutun." },
        { name: "Havuz Aksesuarları", description: "Paslanmaz merdivenler, tutamaklar, atlama tahtaları ve diğer tamamlayıcı ekipmanlar." },
        { name: "Havuz Otomasyon ve Dozaj", description: "Otomatik pH/ORP kontrol ve dozaj sistemleriyle su kimyasını elle uğraşmadan dengede tutun." },
        { name: "Su Test ve Ölçüm", description: "Test kitleri, dijital fotometreler ve test stripleriyle su değerlerini hassas ölçün." },
        { name: "SPA ve Jakuzi Ürünleri", description: "Jakuzi kimyasalları, filtreleri ve bakım ekipmanlarıyla spa keyfini sürdürün." },
    ],
    products: [
        // Havuz Kimyasalları
        { title: "Toz Klor (Kalsiyum Hipoklorit) 25 kg", description: "Yüksek aktif klor oranıyla havuz suyunu dezenfekte eden, hızlı çözünen toz klor. Düzenli dezenfeksiyon için idealdir.", category_name: "Havuz Kimyasalları", price: 2450 },
        { title: "Tablet Klor (Triklor) 90/200 5 kg", description: "Yavaş çözünen 200 gr tabletler hâlinde uzun süreli klor salınımı sağlar. Skimmer veya dozaj şamandırasında kullanılır.", category_name: "Havuz Kimyasalları", price: 1290 },
        { title: "pH Düşürücü (pH Eksi) 10 kg", description: "Yüksek pH değerini ideal aralığa (7.2-7.6) çeken granül asit. Suyun cilde ve ekipmana zarar vermesini önler.", category_name: "Havuz Kimyasalları", price: 540 },
        { title: "Sıvı Alg Önleyici (Algbusti) 5 lt", description: "Havuzda yosun ve alg oluşumunu engelleyen kışlık/sezonluk konsantre çözüm. Suyu yeşillenmeye karşı korur.", category_name: "Havuz Kimyasalları", price: 760 },

        // Havuz Temizlik Ekipmanları
        { title: "Otomatik Havuz Robot Süpürgesi", description: "Havuz tabanını ve duvarlarını otonom tarayarak temizleyen, akıllı navigasyonlu elektrikli robot süpürge. Filtre sepetli.", category_name: "Havuz Temizlik Ekipmanları", price: 18900 },
        { title: "Teleskopik Sap (1.8-3.6 m Alüminyum)", description: "Yaprak ağı, fırça ve vakum başlıklarıyla uyumlu, uzayabilen hafif alüminyum teleskopik sap.", category_name: "Havuz Temizlik Ekipmanları", price: 480 },
        { title: "Yaprak Toplama Ağı (Derin File)", description: "Su yüzeyindeki ve tabandaki yaprak, böcek ve kaba kirleri toplayan dayanıklı derin fileli ağ.", category_name: "Havuz Temizlik Ekipmanları", price: 220 },
        { title: "Havuz Duvar ve Taban Fırçası 45 cm", description: "Sert kıllı, geniş yüzeyli fırça ile havuz duvarlarındaki alg ve kireç birikintilerini sökün.", category_name: "Havuz Temizlik Ekipmanları", price: 310 },

        // Havuz Pompaları
        { title: "Havuz Sirkülasyon Pompası 0.75 HP", description: "Orta boy havuzlar için sessiz ve enerji verimli ön filtreli sirkülasyon pompası. Suyu sürekli dolaşımda tutar.", category_name: "Havuz Pompaları", price: 6900 },
        { title: "Değişken Hızlı (Inverter) Havuz Pompası 1.5 HP", description: "Hız ayarıyla enerji tüketimini %70'e kadar düşüren inverter teknolojili yüksek verimli havuz pompası.", category_name: "Havuz Pompaları", price: 21500 },

        // Havuz Filtreleri
        { title: "Kum Filtre Tankı 500 mm (6 Yollu Vana)", description: "6 yollu seçici vanasıyla filtreleme, ters yıkama ve durulama yapan fiberglas kum filtre tankı. Orta boy havuzlara uygun.", category_name: "Havuz Filtreleri", price: 7800 },
        { title: "Filtre Camı Medyası 25 kg", description: "Kum yerine kullanılan, daha ince filtrasyon ve daha az su tüketimi sağlayan cam filtre medyası.", category_name: "Havuz Filtreleri", price: 1150 },
        { title: "Kartuş Filtre Elemanı (Yıkanabilir)", description: "Küçük havuz ve spa'lar için yıkanabilir, yeniden kullanılabilir kıvrımlı kartuş filtre elemanı.", category_name: "Havuz Filtreleri", price: 690 },

        // Havuz Isıtma Sistemleri
        { title: "Havuz Isı Pompası 12 kW", description: "Düşük enerjiyle havuz suyunu konforlu sıcaklığa getiren, sezon uzatan inverter ısı pompası. 40-60 m³ havuzlara uygun.", category_name: "Havuz Isıtma Sistemleri", price: 64900 },
        { title: "Titanyum Plakalı Eşanjör 40 kW", description: "Kazan veya güneş sistemiyle havuz suyunu dolaylı ısıtan, tuzlu/klorlu suya dayanıklı titanyum eşanjör.", category_name: "Havuz Isıtma Sistemleri", price: 9800 },

        // Havuz Aydınlatma
        { title: "LED Havuz Projektörü RGB 18W", description: "Uzaktan kumandalı, çok renkli RGB LED havuz projektörü. Beton ve prefabrik havuzlara uygun, IP68 sızdırmaz.", category_name: "Havuz Aydınlatma", price: 1450 },
        { title: "Beyaz LED Havuz Lambası 24W", description: "Yüksek lümenli, enerji tasarruflu beyaz ışık havuz lambası. Net ve güvenli gece aydınlatması sağlar.", category_name: "Havuz Aydınlatma", price: 1690 },

        // Havuz Kaplama ve Malzeme
        { title: "Havuz Liner Membranı 1.5 mm (Antibakteriyel)", description: "UV ve kimyasala dayanıklı, antibakteriyel armalı havuz liner membranı. Metrekare bazında uygulanır.", category_name: "Havuz Kaplama ve Malzeme", price: 420 },
        { title: "Cam Mozaik Havuz Kaplaması (m²)", description: "Su altında parlaklığını koruyan, kaymaz yüzeyli dekoratif cam mozaik havuz kaplaması.", category_name: "Havuz Kaplama ve Malzeme", price: 580 },
        { title: "Havuz Derz Dolgu (Epoksi) 5 kg", description: "Su geçirmez, küflenmeye dayanıklı epoksi esaslı havuz derz dolgu malzemesi.", category_name: "Havuz Kaplama ve Malzeme", price: 890 },

        // Havuz Güvenlik Ürünleri
        { title: "Havuz Kışlık Örtüsü (PVC Brandalı, m²)", description: "Kış aylarında havuzu yaprak ve kirden koruyan, dayanıklı PVC brandalı kışlık örtü. Ölçüye göre üretilir.", category_name: "Havuz Güvenlik Ürünleri", price: 240 },
        { title: "Şeffaf Solar Havuz Örtüsü (Baloncuklu, m²)", description: "Güneş ısısını suya aktararak ısıtma sağlayan, buharlaşmayı azaltan baloncuklu solar örtü.", category_name: "Havuz Güvenlik Ürünleri", price: 180 },
        { title: "Çocuk Güvenlik Çiti (Çıkarılabilir Modül)", description: "Havuz çevresine kurulan, çocukların güvenliği için çıkarılabilir modüler güvenlik çiti.", category_name: "Havuz Güvenlik Ürünleri", price: 1350 },

        // Havuz Aksesuarları
        { title: "Paslanmaz Çelik Havuz Merdiveni (3 Basamak)", description: "AISI 304 paslanmaz çelik, kaymaz basamaklı havuz merdiveni. Kolay montajlı, dayanıklı.", category_name: "Havuz Aksesuarları", price: 3200 },
        { title: "Skimmer (Yüzey Temizleyici) Standart", description: "Su yüzeyindeki yaprak ve kirleri emerek toplayan, beton havuzlara gömülen standart skimmer.", category_name: "Havuz Aksesuarları", price: 950 },
        { title: "Havuz Giriş Tutamağı (Korkuluk)", description: "Havuza güvenli iniş-çıkış için paslanmaz çelik tutamak/korkuluk seti.", category_name: "Havuz Aksesuarları", price: 1480 },

        // Havuz Otomasyon ve Dozaj
        { title: "Otomatik pH/ORP Dozaj Sistemi", description: "Su kimyasını sürekli ölçüp klor ve asidi otomatik dozajlayan, elle uğraşı bitiren akıllı dozaj istasyonu.", category_name: "Havuz Otomasyon ve Dozaj", price: 24500 },
        { title: "Tuz Klorinatör (Tuzdan Klor Üretici) 25 g/h", description: "Havuz tuzundan elektroliz yöntemiyle klor üreterek kimyasal alımını azaltan tuz klor sistemi.", category_name: "Havuz Otomasyon ve Dozaj", price: 17900 },

        // Su Test ve Ölçüm
        { title: "Dijital Havuz Su Test Cihazı (Fotometre)", description: "Klor, pH, alkalinite ve siyanürik asidi hassas ölçen dijital fotometre. Net rakamsal sonuç verir.", category_name: "Su Test ve Ölçüm", price: 2100 },
        { title: "Klor/pH Test Kiti (Damla Reaktifli)", description: "Pratik damla reaktifli test kiti ile serbest klor ve pH değerlerini hızlıca kontrol edin.", category_name: "Su Test ve Ölçüm", price: 290 },
        { title: "Test Stribi (4'lü Parametre, 50 Adet)", description: "Suya daldırılıp renk karşılaştırmasıyla 4 parametreyi ölçen pratik test stripleri.", category_name: "Su Test ve Ölçüm", price: 240 },

        // SPA ve Jakuzi Ürünleri
        { title: "Jakuzi/Spa Kimyasal Bakım Seti", description: "Spa suyu için brom/klor, pH dengeleyici ve köpük gidericiden oluşan komple bakım seti.", category_name: "SPA ve Jakuzi Ürünleri", price: 980 },
        { title: "Spa Kartuş Filtresi (Yıkanabilir)", description: "Jakuzi ve spa'lar için yıkanabilir, kolay değiştirilebilir kıvrımlı kartuş filtre.", category_name: "SPA ve Jakuzi Ürünleri", price: 520 },
    ],
}

export const SECTOR_CATALOGS: Record<string, SectorCatalog> = {
    pool: POOL_CATALOG,
    // Gelecekte: vape, fashion, electronics, horeca vb. eklenebilir.
}

/** Sektör anahtarını normalize edip ilgili katalogu döndürür (yoksa null). */
export function getSectorCatalog(sector?: string): SectorCatalog | null {
    if (!sector) return null
    return SECTOR_CATALOGS[sector.trim().toLowerCase()] ?? null
}

/** Desteklenen sektör katalog anahtarlarının listesi. */
export function listCatalogSectors(): string[] {
    return Object.keys(SECTOR_CATALOGS)
}
