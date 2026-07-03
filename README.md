# camera-deteksi-anatomi
Aplikasi deteksi anatomi berbasis browser.

File utama: [camera_tracking_browser.html](camera_tracking_browser.html)

## Cara pakai
1. Buka [camera_tracking_browser.html](camera_tracking_browser.html) di browser (HTTPS direkomendasikan).
2. Unggah foto referensi dengan tombol "Unggah Foto Referensi". Anda bisa memilih beberapa foto.
3. Klik thumbnail foto yang ingin dijadikan referensi lalu klik "Set Foto Referensi".
4. Atur `Threshold` bila perlu (default 70%).
5. Klik "Mulai Kamera" dan arahkan audience ke frame. Hasil presisi akan muncul di sebelah preview.
6. Untuk menyimpan referensi ke browser: klik "Simpan Referensi". Referensi yang tersimpan akan muncul di bagian bawah dan bisa dimuat kembali.

## Fitur
- Live pose tracking menggunakan MediaPipe Pose (CDN).
- Unggah foto referensi dan bandingkan pose live vs foto (skor presisi %).
- Multi-upload dan thumbnail preview.
- Simpan dan muat referensi dari `localStorage`.
- Mirror toggle untuk mengontrol apakah output canvas dimirror atau tidak.
- Threshold slider untuk menyesuaikan ambang penilaian benar/salah.

## Catatan teknis
- Foto referensi disimpan di `localStorage` sebagai data URL; penyimpanan memiliki batas ukuran per browser.
- Perhitungan presisi menormalkan koordinat berdasarkan jarak antar bahu/panggul sebelum membandingkan.
- Ambang default 70% dianggap "Benar"; atur lewat slider.

## Pengujian
- Laptop (landscape): buka halaman, izinkan kamera, non-mirror biasanya diinginkan.
- HP (portrait): akses lewat mobile browser; kamera akan mencoba menggunakan `environment` (kamera belakang).

## File penting
- [camera_tracking_browser.html](camera_tracking_browser.html)
- [camera_tracking.js](camera_tracking.js)

Jika mau, saya bisa menambahkan export/import preset referensi atau commit perubahan ke Git.
