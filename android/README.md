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

Agar dapat update tanpa uninstall:
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
   - `ANDROID_KEY_PASSWORD` = password key
4. Jalankan workflow **Android APK** → dapat `app-release.apk` yang ditandatangani.
   APK berikutnya (dari workflow yang sama) bisa dipasang **di atas** versi lama.

> Jika secret tidak diisi, workflow membuat APK **debug** (tetap bisa dipakai untuk tes, tapi
> update antar-build bisa minta uninstall karena kunci debug berubah).
