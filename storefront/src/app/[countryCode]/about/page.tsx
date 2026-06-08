import { Metadata } from "next"

export const metadata: Metadata = {
    title: "Hakkımızda | Ayna Genesis",
    description: "Ayna Genesis'in hikayesi, misyonu, vizyonu ve temel değerleri.",
}

export default function AboutPage() {
    return (
        <main className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <section className="relative w-full py-24 md:py-32 bg-slate-900 overflow-hidden">
                <div className="absolute inset-0 z-0 opacity-20">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-indigo-900 mix-blend-multiply"></div>
                    <img 
                        src="/images/premium_hero_banner.png" 
                        alt="Hero Background" 
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in-up">
                    <span className="text-blue-400 font-bold tracking-widest uppercase text-sm mb-4 block">
                        Biz Kimiz?
                    </span>
                    <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6">
                        Ayna Genesis: Dürüstlüğün E-Ticaretteki Yüzü
                    </h1>
                    <p className="text-xl text-slate-300 max-w-2xl mx-auto font-light leading-relaxed">
                        Yapay zeka asistanı ve şeffaf hizmet anlayışımızla e-ticaret dünyasında yeni bir standart belirliyoruz. Sadece bir mağaza değil, güvenilir bir dijital asistanınızız.
                    </p>
                </div>
            </section>

            {/* Hikayemiz Section */}
            <section className="py-20 md:py-24 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 text-center animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    <h2 className="text-3xl font-heading font-bold text-gray-900 mb-6">Hikayemiz</h2>
                    <p className="text-lg text-gray-600 leading-relaxed mb-6">
                        Her şey, geleneksel e-ticaretin soğuk ve kafa karıştırıcı yapısını değiştirme fikriyle başladı. Müşterilerin karmaşık filtreler arasında kaybolmak yerine, tıpkı gerçek bir mağazadaki gibi bir uzmana danışabilmesi gerektiğine inandık.
                    </p>
                    <p className="text-lg text-gray-600 leading-relaxed">
                        İşte **Ayna** burada doğdu. Sizi anlayan, ürünleri sizin için karşılaştıran ve sadece ihtiyacınız olanı dürüstçe öneren akıllı bir yol arkadaşı... Ayna Genesis platformuyla alışveriş deneyimini tamamen şeffaf, samimi ve yenilikçi bir yapıya kavuşturduk.
                    </p>
                </div>
            </section>

            {/* Misyon & Vizyon Section */}
            <section className="py-16 bg-white border-y border-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        {/* Misyon */}
                        <div className="p-8 rounded-3xl bg-blue-50 border border-blue-100 hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl mb-6 shadow-lg shadow-blue-600/30">
                                🎯
                            </div>
                            <h3 className="text-2xl font-bold font-heading text-gray-900 mb-4">Misyonumuz</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                Gelişmiş yapay zeka algoritmalarını insan odaklı ve dürüst bir yaklaşımla harmanlayarak, müşterilerimize en doğru ürünleri en şeffaf fiyatlarla ulaştırmak. Karmaşayı ortadan kaldırıp alışverişi kolaylaştırmak.
                            </p>
                        </div>

                        {/* Vizyon */}
                        <div className="p-8 rounded-3xl bg-indigo-50 border border-indigo-100 hover:-translate-y-1 transition-transform duration-300">
                            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl mb-6 shadow-lg shadow-indigo-600/30">
                                🔭
                            </div>
                            <h3 className="text-2xl font-bold font-heading text-gray-900 mb-4">Vizyonumuz</h3>
                            <p className="text-gray-600 text-lg leading-relaxed">
                                E-ticaret sektöründe sadece Türkiye'de değil, küresel çapta "Otonom ve Etik Alışveriş" kavramının öncüsü olmak. Müşterisini koruyan, etik kararlar alabilen akıllı mağazacılığın geleceğini inşa etmek.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Değerlerimiz Section */}
            <section className="py-20 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-gray-900 mb-16">Temel Değerlerimiz</h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[
                        { icon: "🛡️", title: "Şeffaflık", desc: "Hiçbir gizli maliyet veya yanıltıcı pazarlama taktiği olmadan net iletişim kurarız." },
                        { icon: "🤖", title: "İnovasyon", desc: "Ayna ile alışveriş sürecini baştan icat eder, en son AI teknolojilerini kullanırız." },
                        { icon: "⚖️", title: "Dürüstlük", desc: "İhtiyacınız olmayan bir ürünü asla size satmaya çalışmayız. Doğruyu söyleriz." },
                        { icon: "🌟", title: "Müşteri Odaklılık", desc: "Tüm kararlarımızın merkezinde sadece sizin alışveriş deneyiminiz yer alır." },
                    ].map((val, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="text-4xl mb-4">{val.icon}</div>
                            <h4 className="text-xl font-bold text-gray-900 mb-3">{val.title}</h4>
                            <p className="text-gray-500">{val.desc}</p>
                        </div>
                    ))}
                </div>
            </section>
        </main>
    )
}
