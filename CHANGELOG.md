# Changelog APM Rehab Kiosk

## v1.0.4 — 1 April 2026

### Printer Integration

- **Struk Pendaftaran** (Epson TM-T82, 58mm thermal)
  - Auto-cetak saat registrasi berhasil
  - Layout lengkap: No. Registrasi, No. RM, Nama Pasien, Poliklinik, Dokter, Penjamin Bayar, Sesi/Antrian, Ruangan, Waktu, Tgl Registrasi
  - Format tanggal Indonesia

- **Stiker Pasien** (ZDesigner ZD230-203dpi ZPL, 50mm label)
  - Auto-cetak saat registrasi berhasil
  - ZPL format: Nama Pasien + No. RM, 3 kali cetak
  - Raw print via Windows `copy` command

- **Konfigurasi Printer** (`electron/main.js`):
  ```javascript
  const PRINTER_CONFIG = {
    receipt: { name: 'Epson TM-T82', width: 58, silent: true },
    sticker: { name: 'ZDesigner ZD230-203dpi ZPL', width: 50, silent: true }
  }
  ```

- **Auto-Print**: Cetak otomatis struk + stiker saat berhasil registrasi
  - Success screen menampilkan indikator "MENCETAK DOKUMEN..."
  - Tombol "Cetak Dokumen" tetap tersedia untuk cetak ulang

---

## v1.0.3 — 1 April 2026

### API Registrasi

- **Endpoint Registrasi:**
  - `POST /api/appointment/insert/apm/registration1`
  - Payload: `{ AppointmentNo, MedicalNo }`

- **Response Registrasi:**
  - Jika gagal: tampilkan pesan error
  - Jika berhasil: tampilkan data dari response API

### Screen Konfirmasi Data

- Layout 2 kolom dengan max-width 1200px

- **Kolom Kiri:**
  - No. Janji Temu (OPA)
  - No. RM
  - Tanggal Lahir
  - Poliklinik
  - Dokter

- **Kolom Kanan:**
  - Sesi / No. Antrian
  - Nama Pasien
  - No. Handphone
  - Ruangan
  - Waktu

- Tombol Registrasi dan Batal di bagian bawah

### Screen Registrasi Berhasil

- Layout 2 kolom

- **Kolom Kiri:**
  - No. Registrasi (OPR): RegistrationNo
  - No. RM: MedicalNo
  - Tanggal Lahir: DateOfBirth (format Indonesia)
  - Poliklinik: ServiceUnitName
  - Dokter: ParamedicName
  - Penjamin Bayar: BusinessPartnerName

- **Kolom Kanan:**
  - Sesi / No. Antrian: Session / QueueNo
  - Nama Pasien: PatientName
  - No. Handphone: dari data validasi
  - Ruangan: Room
  - Tanggal / Jam Registrasi: RegistrationDate / RegistrationTime
  - Kategori: dari data validasi

### Format Tanggal Indonesia

- Format input: YYYYMMDD, YYYY-MM-DD, DD-Mon-YYYY (29-Sep-2022)
- Format output: "29 September 2022"

### Fitur Blokir Registrasi

- **Blokir Waktu Registrasi** (default: AKTIF)
  - Registrasi hanya bisa dilakukan 30 menit sebelum jadwal

- **Blokir Non-Pasien Umum** (default: AKTIF)
  - Hanya pasien umum lama (isNewPatient='Lama' & customerType='Pribadi')

- Menu Pengaturan (Ctrl+Shift+M → Settings)

### Loading & Error Screen

- Loading adaptif: "MEMVALIDASI JANJI TEMU" / "MELAKUKAN REGISTRASI"
- Error adaptif: pesan berbeda untuk gagal validasi vs gagal registrasi

### Perbaikan Build Windows

- Path icon diperbaiki
- DevTools tidak muncul otomatis (F12 untuk buka)

---

## v1.0.2 — 1 April 2026

### Perubahan UI/UX Scanner

- Teks Title Case
- Tombol Kembali dipindahkan ke bawah
- Tombol Input Manual berwarna biru
- Keterangan lokasi QR Code

---

## v1.0.1 — 31 Maret 2026

### Perubahan UI/UX

- Header Menu Bar Tersembunyi (Ctrl+Shift+M)
- Hapus Context Menu
- SVG Icon

---

## v1.0.0 — Informasi Awal

### Build Windows
```bash
npm run build:win
```
Hasil: folder `release/win-unpacked/`
