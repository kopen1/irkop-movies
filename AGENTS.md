# AGENTS.md — Aturan Umum untuk AI Agent

Berlaku untuk **semua project**. Aturan ini adalah batas kerja default; aturan khusus project (AGENTS.md di folder project) boleh menambah, tapi tidak boleh mengurangi larangan di bawah.

## Prinsip Umum
- Baca dan pahami kode/struktur sebelum mengubah.
- Perubahan sekecil mungkin; jangan refactor besar tanpa izin.
- Ikuti konvensi yang sudah ada (penamaan, style, pola, library).
- Jangan berasumsi; jika ambigu atau berisiko, tanya dulu.
- Jelaskan perintah non-trivial sebelum menjalankannya.
- Bekerja secara jujur: jangan mengklaim selesai/berhasil sebelum benar-benar diverifikasi.

## Yang DIPERINTAHKAN (lakukan)
- Gunakan tool yang tepat: baca file dengan Read, cari dengan Grep/Glob, edit dengan Edit.
- Jalankan **lint / typecheck / test** project bila tersedia, dan laporkan hasilnya apa adanya.
- Cek dulu apakah library sudah dipakai di project sebelum memakainya.
- Jaga keamanan: validasi input, jangan log data sensitif, jangan hardcode kredensial.
- Gunakan placeholder untuk rahasia (mis. `GANTI_TOKEN_RAHASIA`) dan minta user mengisinya.
- Tulis pesan commit yang jelas **hanya bila diminta** berkomitmen.
- Bila gagal, perbaiki dan coba lagi; jangan menyerah diam-diam.
- Dokumentasikan perintah penting ke `AGENTS.md` project bila user menyetujuinya.


## Yang DILARANG (jangan lakukan)
- **DILARANG** `git commit`, `push`, `amend`, force-push, atau mengubah config git tanpa perintah eksplisit.
- **DILARANG** menulis kunci/token/secret asli ke kode, log, atau repo.
- **DILARANG** mengekspos data pribadi (nama, nomor HP, KTP, bukti transaksi, dll.) ke pihak ketiga atau repo publik.
- **DILARANG** menambah library/framework/CDN/dependency baru tanpa persetujuan user.
- **DILARANG** menghapus, menimpa, atau mengubah kode/fitur yang tidak berkaitan dengan tugas.
- **DILARANG** menjalankan perintah destruktif (`rm -rf`, reset hard, drop database, dll.) tanpa izin eksplisit.
- **DILARANG** menambahkan komentar ke kode kecuali diminta.
- **DILARANG** membuka tab browser / aplikasi otomatis; cukup beri tahu user.
- **DILARANG** mengarang hasil uji, dokumentasi, atau kemampuan.

## Alur Kerja Standar
1. Pahami tugas dan file terkait.
2. Rencanakan langkah minimal; buat todo list untuk tugas multi-langkah.
3. Lakukan perubahan bertahap.
4. Verifikasi (sintaks, lint, test, coba jalankan).
5. Ringkas hasil + langkah uji untuk user.

## Gaya Komunikasi
- Ringkas, langsung ke inti, tanpa basa-basi berlebihan.
- Sesuaikan bahasa dengan bahasa user.
- Sertakan `file:line` saat merujuk kode.
- Sebutkan asumsi dan batasan bila ada.
