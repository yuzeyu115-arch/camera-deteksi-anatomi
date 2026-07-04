# 🎯 Sistem Deteksi Anatomi & Tracking Terapi

Aplikasi berbasis browser untuk deteksi skeleton real-time dan analisis gerakan terapi dengan akurasi tinggi.

## ✨ Fitur Utama

### 📱 Responsive Design
- ✅ **Desktop** (1920x1080 dan lebih besar)
- ✅ **Tablet** (768px - 1024px) - Layout stacked
- ✅ **Mobile** (480px - 768px) - Fully responsive
- ✅ **Smartphone** (<480px) - Optimized untuk layar kecil

### 🎮 Kontrol & Input
- ⚙️ **Opsi Aksi Terapi** - 8 pilihan terapi yang berbeda
  - Perbaikan Postur
  - Rentang Gerak Sendi
  - Latihan Kekuatan
  - Keseimbangan
  - Fleksibilitas
  - Analisis Berjalan
  - Koordinasi Gerakan

- 🦴 **Pergerakan Sendi** - 9 pilihan sendi untuk dipantau
  - Bahu (Shoulder)
  - Siku (Elbow)
  - Pergelangan Tangan
  - Pinggul (Hip)
  - Lutut (Knee)
  - Pergelangan Kaki
  - Leher (Neck)
  - Tulang Belakang

- 👤 **Info Pasien** - Input data pasien
  - Nama Pasien
  - Usia
  - Sesi Terapi
  - Tanggal

### 📊 Analisis & Visualisasi
- **Akurasi Deteksi** dengan indicator warna gradient:
  - 🔴 Merah (0-33%)
  - 🟡 Kuning (34-66%)
  - 🟢 Hijau (67-100%)

- **Metrik Jarak Sendi**:
  - Jarak Referensi
  - Jarak Saat Ini
  - Perbedaan Jarak
  - Nilai Kecocokan (0-100)

- **Grafik Akurasi Real-time**
  - Plotting otomatis menggunakan Chart.js
  - Maksimal 30 data point untuk performance

### 📹 Live Tracking
- Real-time skeleton detection menggunakan MediaPipe Pose
- Foto referensi dengan overlay skeleton
- Perbandingan pose live vs foto referensi
- Threshold slider (default 70%)
- Mirror toggle untuk orientasi canvas

### 💾 Penyimpanan
- Simpan referensi ke localStorage
- Export preset sebagai JSON
- Import preset dari JSON
- Preview thumbnail referensi tersimpan

## 🚀 Cara Penggunaan

### Desktop/Laptop
1. Buka `camera_tracking_browser.html` di browser (Chrome, Edge, Firefox)
2. Izinkan akses kamera saat diminta
3. Upload foto referensi dengan skeleton yang jelas
4. Pilih opsi terapi dan sendi yang ingin dipantau
5. Masukkan info pasien
6. Klik **"Mulai Kamera"** untuk memulai tracking
7. Pantau akurasi deteksi dan metrik jarak

### Mobile/Smartphone
1. Akses file melalui browser mobile (Chrome, Safari)
2. Semua UI secara otomatis menyesuaikan dengan ukuran layar
3. Sidebar dan konten utama akan ditampilkan dalam layout column
4. Gunakan landscape mode untuk video feed yang lebih besar
5. All controls tetap accessible dan mudah diklik

## 📋 Struktur File

```
camera-deteksi-anatomi/
├── camera_tracking_browser.html   # File HTML utama dengan CSS responsive
├── camera_tracking.js             # Logika tracking dan pose detection
├── enhanced-ui.js                 # UI enhancements dan chart management
├── package.json                   # Project metadata
├── README.md                      # Dokumentasi (file ini)
├── .gitignore                     # Git ignore rules
└── camera_tracking_legacy.txt     # File legacy (tidak digunakan)
```

## 🛠️ Teknologi yang Digunakan

- **MediaPipe Pose** - Skeleton detection dari Google
- **Chart.js** - Visualisasi grafik real-time
- **HTML5 Canvas** - Rendering video dan drawing
- **CSS3** - Responsive design dan animations
- **JavaScript ES6+** - Core logic

## 📱 Breakpoints Responsive

| Device | Width | Layout |
|--------|-------|--------|
| Desktop | > 1024px | Sidebar + Main Content (2 kolom) |
| Tablet | 768px - 1024px | Stacked Layout (1 kolom) |
| Mobile | 480px - 768px | Optimized untuk mobile |
| Small Phone | < 480px | Minimal layout, touch-friendly |

## ⚙️ Pengaturan & Tips

### Threshold
- **Lebih tinggi (80-95%)**: Deteksi kecocokan pose yang ketat
- **Medium (60-75%)**: Balanced detection
- **Lebih rendah (40-55%)**: Deteksi yang relaxed

### Mirror Toggle
- **ON**: Canvas di-mirror (seperti kamera selfie)
- **OFF**: Normal orientation

### Storage
- Referensi disimpan hingga 50MB per domain
- Clear browser cache untuk reset semua referensi tersimpan
- Gunakan Export untuk backup preset

## 🎓 Use Cases

1. **Fisioterapi Pasien** - Monitor progress gerakan sendi
2. **Analisis Postur** - Deteksi postural deviations
3. **Rehabilitasi Stroke** - Track movement range
4. **Terapi Ortopedi** - Analisis gait dan gerakan
5. **Coaching Olahraga** - Feedback gerakan atlet

## 🐛 Troubleshooting

### Camera tidak bekerja
- Izinkan akses kamera di setting browser
- Gunakan HTTPS (localhost aman)
- Restart browser

### Accuracy rendah
- Pastikan pencahayaan cukup
- Foto referensi harus jelas dan jernih
- Atur threshold yang sesuai
- Posisi badan full-body dalam frame

### Chart tidak muncul
- Refresh page
- Clear browser cache
- Cek internet connection untuk CDN resources

## 📞 Support & Contribution

Untuk issue atau saran, silakan buat issue atau pull request.

## 📄 License

Open source - Feel free to use dan modify sesuai kebutuhan.

---

**Version**: 2.0.0 (Mobile Responsive)  
**Last Updated**: 2026-07-05  
**Author**: Anatomy Detection Team

