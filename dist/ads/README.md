# Folder Video Iklan (Advertisement Videos)

Tambahkan video iklan Anda di folder ini.

## Cara Menggunakan

### 1. Penamaan File (File Naming)

Nama file video Anda dengan format:
```
ad1.mp4    (Video pertama - dipertama kali)
ad2.mp4    (Video kedua)
ad3.mp4    (Video ketiga)
ad4.mp4    (Video keempat)
...        (dst. sampai ad20.mp4)
```

### 2. Contoh Penggunaan

**Jika Anda punya 2 video:**
```
public/ads/
├── ad1.mp4   ← Video 10 detik
└── ad2.mp4   ← Video 15 detik

Hasil: ad1 → ad2 → ad1 → ad2 → ... (berulang selamanya)
```

**Jika Anda punya 5 video:**
```
public/ads/
├── ad1.mp4   ← Promo layanan baru
├── ad2.mp4   ← Tour fasilitas
├── ad3.mp4   ← Testimoni pasien
├── ad4.mp4   ← Info dokter
└── ad5.mp4   ← Jadwal buka

Hasil: ad1 → ad2 → ad3 → ad4 → ad5 → ad1 → ... (berulang)
```

**Jika cuma 1 video:**
```
public/ads/
└── ad1.mp4   ← Satu-satunya video

Hasil: ad1 → ad1 → ad1 → ... (loop terus menerus)
```

## Fleksibilitas Sistem

✅ **Support 1-20 video** - Otomatis mendeteksi berapa video yang ada
✅ **Urutan otomatis** - Main ad1, ad2, ad3, dst., lalu loop ke ad1
✅ **Durasi bebas** - Setiap video bisa panjang berbeda-beda
✅ **Hanya yang ada** - Hanya memutar video yang benar-benar ada di folder

## Format Video

**Format yang direkomendasikan:**
- **Format**: MP4 (H.264 codec)
- **Resolusi**: 1920x1080 (Full HD)
- **Durasi**: Bebas (10 detik - 5 menit)
- **Ukuran file**: Max 100MB per video

**Format lain yang didukung:**
- WebM
- MOV
- AVI

## Spesifikasi Teknis

### Resolusi & Kualitas
- **Recommended**: 1920x1080 (Full HD)
- **Minimum**: 1280x720 (HD)
- **Frame Rate**: 30fps
- **Bitrate**: 5-10 Mbps (untuk kualitas baik)

### Audio
- Video boleh dengan atau tanpa audio
- Volume akan mengikuti setting sistem kiosk
- Format audio: AAC atau MP3

### Durasi
- **Optimal**: 15-60 detik per video
- **Minimum**: 5 detik
- **Maksimal**: Tidak ada batas

## Contoh Struktur Folder

### Untuk 2 Video (Seperti Punya Anda Sekarang)
```
public/ads/
├── ad1.mp4    (10 detik)
├── ad2.mp4    (15 detik)
└── README.md  (File ini)

Urutan Pemutaran:
1. ad1.mp4 (10 detik)
2. Selesai → lanjut ke ad2.mp4
3. ad2.mp4 (15 detik)
4. Selesai → loop kembali ke ad1.mp4
5. Ulangi langkah 1-4 selamanya
```

### Untuk Banyak Video
```
public/ads/
├── ad1.mp4     (Video promosi utama)
├── ad2.mp4     (Video fasilitas)
├── ad3.mp4     (Video testimoni)
├── ad4.mp4     (Video layanan)
├── ad5.mp4     (Video info kontak)
└── README.md

Urutan Pemutaran:
ad1 → ad2 → ad3 → ad4 → ad5 → ad1 → ad2 → ... (terus berulang)
```

## Logika Pemutaran (Playback Logic)

```
JUMLAH VIDEO: 2
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ad1.mp4 (10s) ───────────┐
                            │
ad2.mp4 (15s) ─────────────┤
                            ├─► LOOP FOREVER
                            │
                      (kembali ke awal)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JUMLAH VIDEO: 5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ad1.mp4 ──► ad2.mp4 ──► ad3.mp4 ──► ad4.mp4 ──► ad5.mp4 ──┐
                                                                  │
                                                                  └── LOOP
                                                                  │
                                                           (kembali ke ad1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

JUMLAH VIDEO: 1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ad1.mp4 ──► ad1.mp4 ──► ad1.mp4 ──► ... (loop terus)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Indikator Progress

Di bagian bawah layar akan muncul **titik-titik** (dots) yang menunjukkan:
- **Titik terang/besar**: Video yang sedang diputar
- **Titik redup/kecil**: Video lain yang belum diputar

**Contoh 5 video:**
```
Video 1 main:  ● ● ● ● ●
                  ↑
               aktif

Video 3 main:  ● ● ● ● ●
            ↑
         aktif
```

## Tips & Best Practices

### Untuk Engagement Terbaik
1. **Pendek tapi menarik** - 15-30 detik ideal
2. **Visual berkualitas** - Gunakan resolusi tinggi
3. **Call-to-action jelas** - Informasi kontak/lokasi
4. **Variasi konten** - Campur berbagai jenis iklan
5. **Update berkala** - Ganti video setiap 1-3 bulan

### Untuk Ruang Tunggu
- Volume tidak terlalu keras
- Teks tebal dan mudah dibaca
- Kontras warna baik
- Hindari efek berkedip (stroboscopic)

### Technical Tips
- Kompres video dengan H.264 codec
- Bitrate 5-10 Mbps untuk kualitas baik
- Test di kiosk asli sebelum deploy
- Backup video di lokasi terpisah

## Troubleshooting

### Video Tidak Berputar?

**Masalah**: Layar tetap gelap atau tidak muncul

**Solusi**:
1. Cek nama file: harus `ad1.mp4`, `ad2.mp4`, dst. (bukan `AD1.mp4` atau `Ad 1.mp4`)
2. Pastikan format file MP4, WebM, atau MOV
3. Test video di player lain (VLC, Windows Media Player)
4. Cek ukuran file (terlalu besar mungkin masalah)

### Video Tidak Loop?

**Masalah**: Video berhenti setelah yang terakhir

**Solusi**:
1. Pastikan ada minimal 1 video di folder
2. Cek console browser (F12) untuk error
3. Refresh kiosk atau restart aplikasi
4. Verifikasi file tidak corrupt

### Urutan Salah?

**Masalah**: Video tidak main sesuai urutan

**Solusi**:
1. Pastikan penamaan benar: `ad1.mp4`, `ad2.mp4`, dst.
2. Rename file sesuai urutan yang diinginkan
3. Hapus cache browser
4. Restart aplikasi

### Autoplay Diblokir?

**Masalah**: Video tidak autoplay, harus klik dulu

**Solusi**:
- Kiosk mode seharusnya otomatis allow autoplay
- Jika masih masalah, cek setting Electron/Chromium
- Pastikan tidak ada extension yang memblokir

## Advanced: Lebih dari 20 Video

Butuh lebih dari 20 video? Edit file `src/components/VideoAds.jsx`:

```javascript
// Ubah angka 20 menjadi jumlah yang diinginkan
const videoAds = Array.from({ length: 20 }, (_, i) => `/ads/ad${i + 1}.mp4`)
                                           ↑
                                    Ubah angka ini
```

Contoh untuk 50 video:
```javascript
const videoAds = Array.from({ length: 50 }, (_, i) => `/ads/ad${i + 1}.mp4`)
```

---

**Support**: 1-20 video secara otomatis
**Urutan**: Sequential loop (ad1 → ad2 → ... → adN → ad1 → ...)
**Format**: MP4 recommended, WebM/MOV supported
