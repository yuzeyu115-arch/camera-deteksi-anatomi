# 🚀 Quick Start - Pose Tracking Real-time

## Apa yang Sudah Dilakukan?

Sistem pose tracking telah dioptimasi agar **titik dan garis bergerak mengikuti bentuk badan audience** dengan:
- ✅ Smoothing optimal (tidak jitter)
- ✅ Responsivitas tinggi (tidak lag)
- ✅ Real-time performance monitoring
- ✅ Adaptive detection & smoothing

---

## 🎯 Mulai Sekarang

### 1. Buka Browser
Buka file: **`camera_tracking_browser.html`**

### 2. Klik "Mulai Kamera"
Tombol di sidebar kiri atau area patient

### 3. Izinkan Akses Kamera
Browser akan meminta permission akses kamera → **Izinkan**

### 4. Lihat Tracking Metrics (Top-Right Corner)
```
🎯 Tracking Status
FPS: 24.5      ← Frame rate (hijau=baik)
Motion: 15.2px ← Kecepatan gerakan
Conf: 55%      ← Confidence level
```

### 5. Lihat Titik & Garis Bergerak
- **Titik Merah** = Keypoint (sendi utama)
- **Garis Hijau** = Koneksi antar sendi
- **Gerakan Smooth** = No jitter

---

## 📊 Interpretasi Metrics

### FPS (Frame Per Second)
- 🟢 **24-30 FPS** = Optimal
- 🟡 **15-20 FPS** = Good
- 🔴 **<15 FPS** = Performance terbatas (device heavy load)

### Motion (Pixel)
- **Rendah** = Gerakan lambat/statis
- **Tinggi** = Gerakan cepat
- Sistem otomatis adjust smoothing

### Confidence (%)
- **60-70%** = Sangat confident
- **50-60%** = Confident
- **<50%** = Kurang confident

---

## 🎨 Features

### Real-time Smoothing
Endpoint setiap frame di-smooth menggunakan **Exponential Moving Average**:
- Mengurangi jitter
- Tetap responsif terhadap gerakan
- Adaptif: Lebih smooth saat lambat, lebih responsif saat cepat

### Motion Detection
Sistem mendeteksi kecepatan gerakan:
- Adjust smoothing factor otomatis
- Menampilkan motion speed di metrics

### Adaptive Detection
Confidence threshold menyesuaikan dengan FPS:
- FPS tinggi → Confidence rendah (lebih sensitif)
- FPS rendah → Confidence tinggi (lebih stabil)

---

## ⚙️ Optimization Checklist

✅ Detection confidence optimized (0.5)
✅ EMA smoothing dengan adaptive behavior
✅ Canvas rendering optimization
✅ FPS monitoring built-in
✅ Motion metrics calculation
✅ Performance-aware confidence adjustment
✅ Faster processing pipeline (500ms timeout)

---

## 🔧 Troubleshooting

### Tracking Tidak Muncul
1. ✅ Pastikan lighting bagus
2. ✅ Posisi diri seluruhnya di dalam frame
3. ✅ Cek console (F12) untuk error messages
4. ✅ Refresh halaman dan coba lagi

### FPS Rendah (<15)
1. ✅ Tutup tab browser lain
2. ✅ Kurangi resolusi kamera (jika option ada)
3. ✅ Gunakan device dengan spek lebih tinggi
4. ✅ Cek background tasks di system

### Jitter / Gerakan Tidak Smooth
1. ✅ Normal untuk gerakan cepat (limitation fisik)
2. ✅ Tingkatkan lighting untuk deteksi lebih baik
3. ✅ Gerak lebih smooth untuk hasil optimal

### Confidence Terlalu Rendah
1. ✅ Gunakan lighting lebih terang
2. ✅ Bersihkan camera lens
3. ✅ Jangan terlalu jauh dari camera
4. ✅ Background jangan terlalu kompleks

---

## 📁 File Structure

```
camera-deteksi-anatomi/
├── camera_tracking_browser.html    ← MAIN (buka di browser)
├── camera_tracking.js               ← Core tracking logic (UPDATED)
├── pose-tracker-enhanced.js         ← NEW - Smoothing & optimization
├── enhanced-ui.js                   ← UI & metrics display (UPDATED)
├── enhanced-ui.js                   ← UI styling
├── OPTIMIZATION_GUIDE.md            ← Technical guide
├── IMPLEMENTATION_DETAILS.md        ← Architecture & details
└── QUICK_START.md                   ← This file
```

---

## 🎓 Cara Kerja Sistem

```
1. MediaPipe deteksi pose dari camera stream
   ↓
2. Pose smoothing dengan EMA (Exponential Moving Average)
   ↓
3. Motion detection untuk adaptive behavior
   ↓
4. FPS monitoring & confidence adjustment
   ↓
5. Canvas rendering (optimized)
   ↓
6. Display ke screen dengan metrics real-time
```

---

## 💡 Tips untuk Hasil Optimal

1. **Lighting**
   - Gunakan pencahayaan front/side
   - Hindari backlight langsung
   - Avoid shadows di area tracking

2. **Camera Position**
   - Full body visible dalam frame
   - Jarak optimal: 1-2 meter
   - Level camera setara mata

3. **Background**
   - Simple background lebih baik
   - Avoid clutter di belakang
   - Contrast antara body dan background

4. **Movement**
   - Gerak smooth untuk hasil smooth
   - Fast movement tetap terdeteksi
   - Natural movement lebih akurat

---

## 📞 Questions?

Lihat:
- `OPTIMIZATION_GUIDE.md` - Penjelasan lengkap enhancement
- `IMPLEMENTATION_DETAILS.md` - Technical details
- `README.md` - Dokumentasi project

---

**Version**: 2.0 Enhanced  
**Status**: ✅ Ready to Use  
**Last Updated**: 2026-07-06
