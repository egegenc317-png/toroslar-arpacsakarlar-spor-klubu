'use client'

import { useState } from 'react'

const NAV_ITEMS = [
  { id: 'home', label: 'Anasayfa' },
  { id: 'about', label: 'Kulüp' },
  { id: 'academy', label: 'Akademi' },
  { id: 'contact', label: 'İletişim' },
]

const TEAM_SECTIONS = [
  { title: 'U20', age: '2004-2006 Doğumlu', description: 'Profesyonel seviyeye hazırlık ve disiplinli antrenmanlar.' },
  { title: 'U13', age: '2011-2013 Doğumlu', description: 'Temel teknik, takım oyunu ve saha zekası geliştirme.' },
  { title: 'U12', age: '2012-2014 Doğumlu', description: 'Futbolun temelleri ve güçlü karakter inşası.' },
  { title: 'U11', age: '2013-2015 Doğumlu', description: 'Oyun sevgisi, sosyalleşme ve disiplinle eğitim.' },
]

const STATS = [
  { value: '1990', label: 'Kuruluş Yılı' },
  { value: '010617', label: 'TFF Kulüp Kodu' },
  { value: 'Mersin 1. Amatör Lig', label: 'Lig' },
  { value: '@arpacsakarlarsporklubu', label: 'Instagram' },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState('home')

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--color-light)', color: 'var(--color-dark)', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <header style={{ backgroundColor: 'var(--color-navy)', color: 'white', padding: '18px 0', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: 'linear-gradient(135deg, var(--color-orange), var(--color-turquoise))', display: 'grid', placeItems: 'center', fontSize: '22px' }}>
              ⚽
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '14px', letterSpacing: '1.2px', textTransform: 'uppercase', opacity: 0.88 }}>Toroslar Arpaçsakarlar</p>
              <h1 style={{ margin: '4px 0 0', fontSize: '22px', fontWeight: 800 }}>Spor Kulübü</h1>
            </div>
          </div>

          <nav style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  background: activeTab === item.id ? 'white' : 'transparent',
                  color: activeTab === item.id ? 'var(--color-navy)' : 'white',
                  border: activeTab === item.id ? 'none' : '1px solid rgba(255,255,255,0.35)',
                  borderRadius: '999px',
                  padding: '10px 18px',
                  cursor: 'pointer',
                  fontWeight: activeTab === item.id ? 700 : 500,
                  transition: 'all 0.25s ease',
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '40px 24px 80px' }}>
        {activeTab === 'home' && (
          <section>
            <section style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '32px', alignItems: 'center', marginBottom: '64px' }}>
              <div>
                <p style={{ margin: 0, color: 'var(--color-orange)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', fontSize: '13px' }}>
                  Yerel Futbolda Güçlü Bir Hikaye
                </p>
                <h2 style={{ margin: '18px 0 22px', fontSize: '52px', lineHeight: '1.05', color: 'var(--color-navy)' }}>
                  Toroslar Arpaçsakarlar Spor Kulübü
                </h2>
                <p style={{ margin: 0, fontSize: '18px', lineHeight: '1.9', maxWidth: '760px', color: '#333' }}>
                  1990 yılında kurulan kulübümüz, Mersin Toroslar merkezinde amatör liglerde mücadele ederken aynı zamanda altyapıyı güçlendiriyor.
                  Amacımız; gençleri futbolla tanıştırmak, onları suç ortamından uzak tutmak ve topluma kazandırmak.
                </p>
              </div>

              <div style={{ background: 'linear-gradient(180deg, rgba(26,45,92,0.98) 0%, rgba(32,178,170,0.95) 100%)', borderRadius: '24px', padding: '32px', color: 'white', boxShadow: '0 24px 60px rgba(26, 45, 92, 0.14)' }}>
                <p style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1.4px', opacity: 0.9 }}>Kulüp Bilgileri</p>
                <h3 style={{ margin: '18px 0 20px', fontSize: '28px' }}>Mersin Toroslar</h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, lineHeight: '2' }}>
                  <li><strong>Kuruluş:</strong> 1990</li>
                  <li><strong>Lig:</strong> Mersin 1. Amatör Lig</li>
                  <li><strong>TFF Kodu:</strong> 010617</li>
                  <li><strong>Instagram:</strong> @arpacsakarlarsporklubu</li>
                  <li><strong>Başkan:</strong> Naci Genç</li>
                </ul>
              </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '64px' }}>
              {STATS.map((stat) => (
                <div key={stat.label} style={{ backgroundColor: 'white', borderRadius: '22px', padding: '28px', boxShadow: '0 18px 40px rgba(0, 0, 0, 0.08)' }}>
                  <p style={{ margin: 0, fontSize: '14px', color: 'var(--color-orange)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>{stat.label}</p>
                  <h3 style={{ margin: '14px 0 0', fontSize: '36px', color: 'var(--color-navy)' }}>{stat.value}</h3>
                </div>
              ))}
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '64px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
                <h3 style={{ marginTop: 0, color: 'var(--color-navy)', fontSize: '28px' }}>Kulübün Misyonu</h3>
                <p style={{ color: '#4d4d4d', lineHeight: '1.85' }}>
                  Kulübümüz gençlerin sporla tanışması ve geliştirilmesi için çalışır. Amacımız sadece saha başarısı değil, aynı zamanda bölge çocuklarının kriminal çevrelerden uzak kalmasına destek olmaktır.
                </p>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
                <h3 style={{ marginTop: 0, color: 'var(--color-navy)', fontSize: '28px' }}>Kulübün Vizyonu</h3>
                <p style={{ color: '#4d4d4d', lineHeight: '1.85' }}>
                  Kilit hedefimiz; keşfedilmemiş yetenekleri bulup Türk futboluna kazandırmak ve Arpaçsakarlar&apos;ı sporun merkezi haline getirmektir.
                </p>
              </div>
            </section>
          </section>
        )}

        {activeTab === 'about' && (
          <section style={{ paddingTop: '40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '32px', marginBottom: '56px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
                <h2 style={{ color: 'var(--color-navy)', fontSize: '42px', margin: '0 0 18px' }}>Hikayemiz</h2>
                <p style={{ color: '#4d4d4d', lineHeight: '1.9', marginBottom: '20px' }}>
                  1990 yılında Toroslar&apos;da kurulan Toroslar Arpaçsakarlar Spor Kulübü, amatör ruhla başlayıp her zaman gençlerin yanında oldu. A takımı 2019-2020 sezonunda Süper Amatör Lig&apos;e kadar yükseldi ve sonra tamamen akademiye odaklanarak küçük yaş gruplarına yatırım yaptı.
                </p>
                <p style={{ color: '#4d4d4d', lineHeight: '1.9' }}>
                  Şu anda en büyük yaşımız 2013, en küçük yaşımız 2020 doğumlu sporcularımızla birlikte küçük liglerde mücadele ediyoruz. Hedefimiz; gençleri keşfetmek, onları Türk futboluna kazandırmak ve sporu bir yaşam biçimi haline getirmektir.
                </p>
              </div>
              <div style={{ background: 'linear-gradient(180deg, rgba(32,178,170,0.95), rgba(255,140,0,0.95))', borderRadius: '24px', padding: '40px', color: 'white', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.12)' }}>
                <h3 style={{ marginTop: 0, fontSize: '30px' }}>Sosyal Sorumluluk</h3>
                <p style={{ lineHeight: '1.9' }}>
                  Kulübümüz sadece maç kazanmak için değil, aynı zamanda çocukların suça bulaşmadan sağlıklı bir ortamda büyümeleri için var.
                </p>
                <ul style={{ paddingLeft: '20px', lineHeight: '2', marginTop: '24px' }}>
                  <li>Toplumsal dayanışma</li>
                  <li>Ahlaklı ve centilmen bireyler</li>
                  <li>Güçlü spor kültürü</li>
                </ul>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
                <h3 style={{ color: 'var(--color-navy)', marginBottom: '14px' }}>Başarılar</h3>
                <p style={{ color: '#4d4d4d', lineHeight: '1.9' }}>
                  A takımı 2019-2020 sezonunda Süper Amatör Lig&apos;e yükseldi. Ancak gerçek başarı, altyapıyı büyütmek ve gençlerin gelişimine odaklanmak oldu.
                </p>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
                <h3 style={{ color: 'var(--color-navy)', marginBottom: '14px' }}>Yönetim</h3>
                <p style={{ color: '#4d4d4d', lineHeight: '1.9' }}>
                  Kulüp başkanlığını güncel olarak Naci Genç yürütüyor. Bazen farklı kaynaklarda Adem Yaşar ismi de geçmekte olup, kulübün yönetim yapısı toplulukla birlikte şekilleniyor.
                </p>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'academy' && (
          <section style={{ paddingTop: '40px' }}>
            <div style={{ marginBottom: '56px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '40px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
                <h2 style={{ color: 'var(--color-navy)', fontSize: '42px', margin: '0 0 18px' }}>Akademi</h2>
                <p style={{ color: '#4d4d4d', lineHeight: '1.9' }}>
                  Akademimiz, bölgedeki çocukları futbolla tanıştırmak ve yeteneklerini en iyi şekilde geliştirmek için çalışıyor. Her yaş grubuna uygun eğitim programları ve turnuvalar düzenliyoruz.
                </p>
              </div>
              <div style={{ background: 'linear-gradient(180deg, rgba(26,45,92,0.95), rgba(32,178,170,0.95))', borderRadius: '24px', padding: '40px', color: 'white', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.12)' }}>
                <h3 style={{ marginTop: 0, fontSize: '30px' }}>Hedef</h3>
                <p style={{ lineHeight: '1.9' }}>
                  Keşfedilmemiş genç yetenekleri bulup onları Türk futboluna kazandırmak. Sporu, karakter gelişiminin ve sosyal bağların temel bir parçası haline getirmek.
                </p>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' }}>
              {TEAM_SECTIONS.map((team) => (
                <div key={team.title} style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--color-navy)' }}>{team.title}</h3>
                  <p style={{ color: 'var(--color-orange)', margin: '8px 0 16px', fontWeight: 700 }}>{team.age}</p>
                  <p style={{ color: '#4d4d4d', lineHeight: '1.8' }}>{team.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'contact' && (
          <section style={{ paddingTop: '40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '56px' }}>
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
                <h2 style={{ color: 'var(--color-navy)', marginTop: 0 }}>Adres</h2>
                <p style={{ color: '#4d4d4d', lineHeight: '1.8' }}>Arpaçsakarlar Mahallesi, Toroslar, Mersin, Türkiye</p>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
                <h2 style={{ color: 'var(--color-navy)', marginTop: 0 }}>Sosyal Medya</h2>
                <p style={{ color: '#4d4d4d', lineHeight: '1.8' }}>Instagram: <strong>@arpacsakarlarsporklubu</strong></p>
              </div>
              <div style={{ backgroundColor: 'white', borderRadius: '24px', padding: '32px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
                <h2 style={{ color: 'var(--color-navy)', marginTop: 0 }}>Kulüp Başkanı</h2>
                <p style={{ color: '#4d4d4d', lineHeight: '1.8' }}>Naci Genç</p>
              </div>
            </div>
            <div style={{ backgroundColor: '#fff', borderRadius: '24px', padding: '40px', boxShadow: '0 16px 42px rgba(0, 0, 0, 0.08)' }}>
              <h3 style={{ color: 'var(--color-navy)', marginTop: 0 }}>Kulübe Nasıl Katılabilirsiniz?</h3>
              <p style={{ color: '#4d4d4d', lineHeight: '1.9' }}>
                Kulübümüzün altyapı seçmelerini ve akademi başvurularını Instagram üzerinden takip edebilirsiniz. Mevcut yaş gruplarımız U11, U12, U13 ve U20 seviyelerinde çalışmalar yapmaktadır.
              </p>
            </div>
          </section>
        )}
      </main>

      <footer style={{ backgroundColor: 'var(--color-navy)', color: 'white', padding: '32px 24px', textAlign: 'center' }}>
        <p style={{ margin: '0 0 8px', fontWeight: 600 }}>Toroslar Arpaçsakarlar Spor Kulübü</p>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)' }}>1990&apos;dan beri gençlere spor yoluyla gelecek sunuyoruz.</p>
      </footer>
    </div>
  )
}