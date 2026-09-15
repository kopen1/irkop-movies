# NontonGo — Android (native, Java)

Aplikasi Android **native** (bukan WebView) yang mengonsumsi API NontonGo.
UI dibangun ulang di Android: Home, Populer, Genre, Cari (autocomplete), Watchlist &
Riwayat (lokal), Detail (sinopsis + episode per-season + rekomendasi), dan Player
(ExoPlayer HLS dengan pilih server + auto-next episode).

## Teknologi
- Java, AndroidX (AppCompat, Material, RecyclerView, ConstraintLayout)
- Retrofit + Gson (networking)
- Glide (gambar)
- Media3 ExoPlayer + ExoPlayer-HLS (pemutar)
- SharedPreferences + Gson (watchlist & riwayat lokal)

## Konfigurasi
Base URL API ada di `app/build.gradle`:
```groovy
buildConfigField "String", "BASE_URL", "\"https://irkop-movies.pages.dev/\""
```
Ganti bila domain berubah (harus diakhiri `/`).

## Persyaratan
- JDK 17
- Android SDK (compileSdk 34), minSdk 26
- Gradle 8.6 (atau Android Studio terbaru)

## Build

### Android Studio
1. `File → Open` → pilih folder `android/`.
2. Tunggu Gradle sync.
3. Run ▶ ke perangkat/emulator, atau `Build → Build Bundle(s)/APK(s) → Build APK(s)`.

### CLI (PC/Linux)
```bash
cd android
gradle assembleDebug
# hasil: app/build/outputs/apk/debug/app-debug.apk
```

### GitHub Actions
Workflow `.github/workflows/android.yml` otomatis build APK saat folder `android/` berubah
(atau manual via **Actions → Android APK → Run workflow**). Unduh APK di artifact
`nontongo-debug-apk`.

## Catatan
- Tampilan mengikuti website: **top bar + hamburger (drawer)** dan **bottom nav** yang tetap
  tampil juga saat membuka detail (detail = fragment, bukan activity terpisah).
- Pemutar memakai **ExoPlayer HLS** dengan proxy `/api/stream/play`. Bila server pertama
  bermasalah, gunakan dropdown server (p2p/turbovip/cast/hydrax). Bila stream belum tersedia
  (belum di-mapping & relay mati), app membuka mirror di browser.
- Watchlist & riwayat disimpan **di perangkat**, tanpa login.
- Tidak ada Gradle Wrapper di repo ini; untuk CLI gunakan `gradle` (atau jalankan
  `gradle wrapper` sekali untuk membuat `gradlew`).

## Update tanpa uninstall (signing)
Android hanya mengizinkan update bila APK baru ditandatangani dengan **kunci yang sama** dan
`versionCode` lebih besar. Workflow sudah otomatis menaikkan `versionCode` dari nomor build GitHub.

### Cara cepat: generate keystore lewat GitHub
Jalankan workflow **Actions → Generate Android Keystore → Run workflow** (isi password & alias).
Setelah selesai, buka **log job**-nya → copy nilai yang tercetak:
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_PASSWORD`
- `ANDROID_KEYSTORE_BASE64` (satu baris panjang, di antara `BEGIN_BASE64`/`END_BASE64`)

Lalu isi di **Settings → Secrets and variables → Actions**.

> ⚠️ **Penting:** log workflow bisa dilihat siapa pun yang punya akses repo (dan pada repo publik,
> log/artifact bisa diakses publik). Setelah menyalin nilai, **hapus run ini/artifact**, jangan
> bagikan isinya, dan sebaiknya hapus file `.github/workflows/generate-keystore.yml` setelah dipakai.
> Kalau ragu, generate keystore secara lokal (cara di bawah) dan repo tetap privat.

Agar dapat update tanpa uninstall (cara lokal):
1. Buat keystore sekali (di PC):
   ```bash
   keytool -genkeypair -v -keystore nontongo.keystore -alias nontongo \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
2. Encode base64:
   ```bash
   base64 -w0 nontongo.keystore > keystore.b64
   ```
3. Tambahkan **GitHub → Settings → Secrets and variables → Actions**:
   - `ANDROID_KEYSTORE_BASE64` = isi `keystore.b64`
   - `ANDROID_KEYSTORE_PASSWORD` = password keystore
   - `ANDROID_KEY_ALIAS` = `nontongo`
   - `ANDROID_KEY_PASSWORD` = 'nontongo'
4. Jalankan workflow **Android APK** → dapat `app-release.apk` yang ditandatangani.
   APK berikutnya (dari workflow yang sama) bisa dipasang **di atas** versi lama.

> Jika secret tidak diisi, workflow membuat APK **debug** (tetap bisa dipakai untuk tes, tapi
> update antar-build bisa minta uninstall karena kunci debug berubah).


======================================================
 COPY NILAI BERIKUT KE GITHUB SECRETS
======================================================

ANDROID_KEY_ALIAS = nontongo
ANDROID_KEYSTORE_PASSWORD = nontongo
ANDROID_KEY_PASSWORD = nontongo

ANDROID_KEYSTORE_BASE64 = (satu baris panjang di bawah ini):

----BEGIN_BASE64----
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
----END_BASE64----
