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
- Pemutar memakai `/api/stream/play` dari API. Bila server pertama bermasalah, gunakan
  dropdown server (p2p/turbovip/cast/hydrax). Bila stream belum tersedia (belum di-mapping &
  relay mati), app membuka mirror di browser.
- Watchlist & riwayat disimpan **di perangkat**, tanpa login.
- Tidak ada Gradle Wrapper di repo ini; untuk CLI gunakan `gradle` (atau jalankan
  `gradle wrapper` sekali untuk membuat `gradlew`).
