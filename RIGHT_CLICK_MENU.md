# Menu Klik Kanan - Setting, Reset, Exit

## Fitur Baru 🎉

Kiosk sekarang memiliki **menu klik kanan** dengan 3 opsi:
- **Setting Video** - Pilih video mana yang mau diputar
- **Reset Kiosk** - Kembali ke halaman utama
- **Exit Kiosk** - Keluar dari mode kiosk

## Cara Menggunakan

### 1. Buka Menu Klik Kanan

**Kapan saja ada di layar iklan**, klik kanan mouse untuk membuka menu:

```
┌────────────────────────────┐
│     ⚙️ Menu Kiosk          │
├────────────────────────────┤
│ 🎬 Setting Video           │
│    Pilih video yang diputar │
├────────────────────────────┤
│ 🔄 Reset Kiosk             │
│    Kembali ke halaman utama │
├────────────────────────────┤
│ 🚪 Exit Kiosk              │
│    Keluar dari mode kiosk  │
└────────────────────────────┘
```

### 2. Setting Video

Klik **"Setting Video"** untuk membuka panel setting:

#### Fitur Panel Setting:
- ✅ **Pilih Semua** - Aktifkan semua video
- ❌ **Batal Pilih** - Nonaktifkan semua
- ☑️ **Checkbox** - Pilih video satu per satu

#### Cara Pakai:
1. Panel akan menampilkan semua video yang tersedia (ad1.mp4, ad2.mp4, dst.)
2. Klik video yang ingin diputar
3. Klik **"Simpan & Reload"**
4. File `videos.json` akan didownload
5. **Replace** file `public/ads/videos.json` dengan file yang didownload
6. **Refresh** aplikasi (tekan F5)
7. Video yang dipilih akan aktif!

#### Contoh:
```
Tersedia:
☑️ ad1.mp4  - Akan diputar
☑️ ad2.mp4  - Akan diputar
⬜ ad3.mp4  - Tidak diputar
⬜ ad4.mp4  - Tidak diputar

Result: Hanya ad1 dan ad2 yang akan diputar
```

### 3. Reset Kiosk

Klik **"Reset Kiosk"** untuk:
- Keluar dari mode iklan
- Kembali ke halaman utama
- User bisa mulai registrasi baru

**Konfirmasi**: Akan muncul popup "Reset kiosk ke halaman utama?"

### 4. Exit Kiosk

Klik **"Exit Kiosk"** untuk:
- Keluar dari mode fullscreen
- Buka window control
- Bisa tutup aplikasi

**Security**: Masukkan password: `admin123`

## Video Mapping Flow

### Workflow Lengkap:

```
1. Klik Kanan di layar iklan
       ↓
2. Pilih "Setting Video"
       ↓
3. Pilih video yang mau diputar
       ↓
4. Klik "Simpan & Reload"
       ↓
5. File videos.json didownload
       ↓
6. Replace public/ads/videos.json
       ↓
7. Refresh (F5)
       ↓
8. Video yang dipilih aktif!
```

### Contoh Penggunaan:

#### Skenario 1: Hanya Mau Mainkan 2 Video

```
Panel Setting:
☑️ ad1.mp4  ← Dipilih
☑️ ad2.mp4  ← Dipilih
⬜ ad3.mp4
⬜ ad4.mp4
⬜ ad5.mp4

Result: Hanya ad1 → ad2 → ad1 → ad2 ...
```

#### Skenario 2: Mainkan Semua Video

```
Panel Setting:
☑️ ad1.mp4
☑️ ad2.mp4
☑️ ad3.mp4
☑️ ad4.mp4
☑️ ad5.mp4

Result: ad1 → ad2 → ad3 → ad4 → ad5 → ad1 ...
```

#### Skenario 3: Skip Video Tertentu

```
Panel Setting:
☑️ ad1.mp4
⬜ ad2.mp4  ← Skip
☑️ ad3.mp4
⬜ ad4.mp4  ← Skip
☑️ ad5.mp4

Result: ad1 → ad3 → ad5 → ad1 ...
```

## Tips & Best Practices

### Untuk Admin Kiosk:

1. **Simpan Password** - Password exit: `admin123`
   - Ganti di `src/components/VideoAds.jsx` baris 95

2. **Backup videos.json** - Sebelum edit, backup dulu

3. **Test Setelah Ganti** - Selalu test setelah ganti konfigurasi

4. **Video Availability** - Pastikan file video benar-benar ada sebelum dipilih

### Troubleshooting:

**Menu tidak muncul?**
- Pastikan klik kanan di area video/iklan
- Cek console browser (F12) untuk error

**Setting tidak tersimpan?**
- Pastikan file videos.json yang didownload replace yang lama
- Refresh aplikasi (F5)

**Video tidak berubah setelah ganti setting?**
- Clear cache browser
- Pastikan file videos.json di public/ads/ sudah benar
- Refresh aplikasi

**Lupa password exit?**
- Default: `admin123`
- Ganti di kode: VideoAds.jsx baris 95

## Password Default

```
Exit Kiosk Password: admin123
```

**Untuk mengganti password**, edit file `src/components/VideoAds.jsx`:

```javascript
const password = prompt('🔐 Masukkan password untuk keluar:', 'admin123')
//                                                            ↑
//                                                    Ganti password di sini
```

## Security Notes

- ⚠️ **Password exit** untuk mencegah sembarang orang keluar dari kiosk mode
- 🔒 **Setting panel** dilindungi (harus klik kanan)
- ✅ **Reset** memerlukan konfirmasi
- 🚪 **Exit** memerlukan password

## File Terkait

```
src/components/
├── VideoAds.jsx        ← Main component dengan klik kanan
├── ContextMenu.jsx     ← Menu klik kanan
├── SettingsPanel.jsx   ← Panel setting video
└── videoConfig.js      ← Service untuk simpan config

public/ads/
└── videos.json         ← Konfigurasi video (diedit via setting)
```

## Advanced Configuration

### Ganti Tombol Klik Kanan

Mau pakai tombol keyboard daripada klik kanan?

Tambahkan di `VideoAds.jsx`:

```javascript
useEffect(() => {
  const handleKeyPress = (e) => {
    // F1 untuk Setting
    if (e.key === 'F1') {
      e.preventDefault()
      handleOpenSettings()
    }
    // F2 untuk Reset
    if (e.key === 'F2') {
      e.preventDefault()
      handleReset()
    }
    // F3 untuk Exit
    if (e.key === 'F3') {
      e.preventDefault()
      handleExit()
    }
  }

  window.addEventListener('keydown', handleKeyPress)
  return () => window.removeEventListener('keydown', handleKeyPress)
}, [])
```

### Custom Password dari Environment

Buat file `.env`:
```
VITE_KIOSK_EXIT_PASSWORD=mySecretPassword123
```

Di `VideoAds.jsx`:
```javascript
const password = prompt('Password:', import.meta.env.VITE_KIOSK_EXIT_PASSWORD || 'admin123')
```

---

**Fitur ini memudahkan admin untuk:**
- ✅ Mengatur video tanpa edit kode
- ✅ Reset kiosk dengan cepat
- ✅ Exit dengan password protection
- ✅ Fleksibel pilih video yang mau diputar

🎉 **Sekarang admin bisa mengatur video dari kiosk sendiri!**
