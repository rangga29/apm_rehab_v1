# Panduan Video Iklan - Fleksibel 1-20 Video

## Ringkasan Sistem

✅ **Fleksibel**: Otomatis deteksi 1-20 video
✅ **Loop Otomatis**: Video terakhir kembali ke video pertama
✅ **Durasi Bebas**: Setiap video boleh panjang berbeda
✅ **Urutan Jelas**: ad1 → ad2 → ad3 → ... → adN → ad1 (loop)

## Jawaban Pertanyaan Anda

> "Apakah itu karena video yang saya masukkan baru 2?"

**Tidak!** Sistem sekarang sudah **super fleksibel**:

### Dengan 2 Video (Seperti Punya Anda)
```
ad1.mp4 (10 detik) ─────┐
                         ├──> Loop terus
ad2.mp4 (15 detik) ─────┘

Urutan:
1. ad1 main (10 detik)
2. Selesai, pindah ke ad2
3. ad2 main (15 detik)
4. Selesai, loop kembali ke ad1
5. Ulangi langkah 1-4 selamanya ✓
```

### Dengan 5 Video
```
ad1 → ad2 → ad3 → ad4 → ad5 → ad1 → ad2 → ... (loop)
```

### Dengan 10 Video
```
ad1 → ad2 → ad3 → ad4 → ad5 → ad6 → ad7 → ad8 → ad9 → ad10 → ad1 → ...
```

### Dengan 1 Video Saja
```
ad1 → ad1 → ad1 → ad1 → ... (loop terus)
```

## Cara Kerja (Teknis)

Sistem akan:
1. **Scan folder** `public/ads/`
2. **Deteksi** semua video dari `ad1.mp4` sampai `ad20.mp4`
3. **Hanya mainkan** video yang benar-benar ada
4. **Loop** kembali ke awal setelah video terakhir selesai

**Contoh Output di Console:**
```
✅ Video ditemukan: /ads/ad1.mp4
✅ Video ditemukan: /ads/ad2.mp4
🎬 Total 2 video iklan berhasil dimuat
📋 Urutan pemutaran: ["/ads/ad1.mp4", "/ads/ad2.mp4"]

🎬 Video 1 selesai, lanjut ke video 2
🎬 Video 2 selesai, lanjut ke video 1  ← Loop!
🎬 Video 1 selesai, lanjut ke video 2
...
```

## Visualisasi Loop

### Skenario: 2 Video dengan Durasi Berbeda

```
WAKTU: 0s ----10s---- 25s ----35s---- 50s ----60s---- ...
       │       │       │       │       │       │
VIDEO: [ad1]   [ad2]   [ad1]   [ad2]   [ad1]   [ad2]
        10s     15s     10s     15s     10s     15s

Lanjuut terus selamanya...
```

### Skenario: 3 Video

```
WAKTU: 0s --10s-- 22s --35s-- 50s --60s-- 72s --...
       │      │      │      │      │      │
VIDEO: [ad1]  [ad2]  [ad3]  [ad1]  [ad2]  [ad3]
        10s    12s    15s    10s    12s    15s

Loop: ad1 → ad2 → ad3 → ad1 → ad2 → ad3 → ...
```

## Indikator di Layar

Ketika iklan berjalan, di bagian bawah layar ada titik-titik:

**2 Video:**
```
● ●    (Video 1 main)
↑

● ●    (Video 2 main)
  ↑
```

**5 Video:**
```
● ● ● ● ●    (Video 3 main)
    ↑
```

**1 Video:**
```
(Tidak ada indikator - langsung loop video itu sendiri)
```

## Tambah Video Baru

### Contoh: Punya 2 Video, Mau Tambah 3 Lagi

**Langkah 1**: Tambah file video
```
public/ads/
├── ad1.mp4    (sudah ada)
├── ad2.mp4    (sudah ada)
├── ad3.mp4    (baru ditambah)
├── ad4.mp4    (baru ditambah)
└── ad5.mp4    (baru ditambah)
```

**Langkah 2**: Restart kiosk (atau tunggu idle timeout)

**Langkah 3**: Sistem otomatis!
```
Urutan baru:
ad1 → ad2 → ad3 → ad4 → ad5 → ad1 → ... (loop)
```

### Contoh: Hapus Video

**Langkah 1**: Hapus file video
```
public/ads/
├── ad1.mp4    (tetap)
├── ad2.mp4    (dihapus)
└── ad3.mp4    (tetap)
```

**Langkah 2**: Restart kiosk

**Langkah 3**: Sistem otomatis adjust!
```
Urutan baru:
ad1 → ad3 → ad1 → ad3 → ... (loop)
```

## Konsol Debug (Untuk Troubleshooting)

Buka console browser (F12) untuk melihat:

### Normal Operation
```
✅ Video ditemukan: /ads/ad1.mp4
✅ Video ditemukan: /ads/ad2.mp4
🎬 Total 2 video iklan berhasil dimuat
📋 Urutan pemutaran: ["/ads/ad1.mp4", "/ads/ad2.mp4"]
🎬 Video 1 selesai, lanjut ke video 2
🎬 Video 2 selesai, lanjut ke video 1
🎬 Video 1 selesai, lanjut ke video 2
...
```

### Jika Video Tidak Ditemukan
```
⚠️ Tidak ada video iklan ditemukan. Tambahkan video ke folder public/ads/
```

### Jika Logo Ditemukan
```
✅ Logo ditemukan: /logo/logo.png
```

### Jika Logo Tidak Ada
```
ℹ️ Logo belum ditambahkan, menggunakan placeholder
```

## Checklist Penggunaan

- [ ] Video diberi nama: `ad1.mp4`, `ad2.mp4`, dst.
- [ ] File diletakkan di: `public/ads/`
- [ ] Format video: MP4 (recommended)
- [ ] Aplikasi di-restart setelah tambah/hapus video
- [ ] Cek console (F12) untuk memastikan video terdeteksi
- [ ] Test pemutaran beberapa loop sampai yakin

## Summary

| Pertanyaan | Jawaban |
|-----------|---------|
| **Berapa video yang didukung?** | 1-20 video (otomatis) |
| **Apakah harus urut?** | Ya, ad1, ad2, ad3, dst. |
| **Durasi harus sama?** | Tidak, bebas berbeda-beda |
| **Apakah otomatis loop?** | Ya, video terakhir → kembali ke video pertama |
| **Bisa tambah video baru?** | Ya, cukup tambah file dan restart |
| **Bisa hapus video?** | Ya, sistem otomatis adjust |

---

**Kesimpulan**: Sistem sekarang **100% fleksibel** untuk jumlah video berapapun! 🎉
