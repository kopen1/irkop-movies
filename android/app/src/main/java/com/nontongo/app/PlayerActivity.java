package com.nontongo.app;

import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.Player;
import androidx.media3.datasource.DefaultDataSource;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.hls.HlsMediaSource;
import androidx.media3.ui.PlayerView;

import com.nontongo.app.model.Episode;
import com.nontongo.app.model.EpisodesResponse;
import com.nontongo.app.model.LocalHistory;
import com.nontongo.app.model.PlayResponse;
import com.nontongo.app.net.ApiClient;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class PlayerActivity extends AppCompatActivity {

    private PlayerView playerView;
    private ExoPlayer player;
    private ProgressBar progress;
    private Spinner serverSpinner;
    private TextView titleView;
    private LinearLayout msgWrap;
    private TextView msgView;
    private LinearLayout playerBar;

    private String slug;
    private String title;
    private String poster;
    private String type;

    private final List<Episode> episodes = new ArrayList<>();
    private boolean spinnerReady = false;
    private boolean fullscreen = false;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private long lastSaved = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_player);

        playerView = findViewById(R.id.player_view);
        progress = findViewById(R.id.player_progress);
        serverSpinner = findViewById(R.id.server_spinner);
        titleView = findViewById(R.id.player_title);
        msgWrap = findViewById(R.id.player_msg_wrap);
        msgView = findViewById(R.id.player_msg);
        playerBar = findViewById(R.id.player_bar);
        ImageView close = findViewById(R.id.btn_close);
        ImageView fullscreenBtn = findViewById(R.id.btn_fullscreen);
        View backMsg = findViewById(R.id.btn_back_msg);
        if (backMsg != null) backMsg.setOnClickListener(v -> finish());
        playerView.setOnClickListener(v -> toggleBar());

        slug = getIntent().getStringExtra("slug");
        title = getIntent().getStringExtra("title");
        poster = getIntent().getStringExtra("poster");
        type = getIntent().getStringExtra("type");
        titleView.setText(title != null ? title : slug);

        close.setOnClickListener(v -> finish());
        fullscreenBtn.setOnClickListener(v -> toggleFullscreen());

        player = new ExoPlayer.Builder(this).build();
        playerView.setPlayer(player);
        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_READY) progress.setVisibility(View.GONE);
                if (state == Player.STATE_ENDED) onEnded();
            }
        });

        if ("series".equalsIgnoreCase(type)) loadEpisodes();
        loadPlay(0);
    }

    private void loadEpisodes() {
        ApiClient.get().episodes(slug).enqueue(new Callback<EpisodesResponse>() {
            @Override
            public void onResponse(@NonNull Call<EpisodesResponse> call, @NonNull Response<EpisodesResponse> response) {
                EpisodesResponse body = response.body();
                if (body != null && body.items != null) {
                    episodes.clear();
                    episodes.addAll(body.items);
                }
            }

            @Override
            public void onFailure(@NonNull Call<EpisodesResponse> call, @NonNull Throwable t) {}
        });
    }

    private void showMessage(String text) {
        progress.setVisibility(View.GONE);
        playerView.setVisibility(View.GONE);
        playerBar.setVisibility(View.GONE);
        msgWrap.setVisibility(View.VISIBLE);
        msgView.setText(text);
    }

    private void loadPlay(int server) {
        progress.setVisibility(View.VISIBLE);
        msgWrap.setVisibility(View.GONE);
        playerView.setVisibility(View.VISIBLE);
        ApiClient.get().play(slug, server > 0 ? server : null).enqueue(new Callback<PlayResponse>() {
            @Override
            public void onResponse(@NonNull Call<PlayResponse> call, @NonNull Response<PlayResponse> response) {
                PlayResponse body = response.body();
                if (body == null) {
                    showMessage("Gagal memuat data stream.");
                    return;
                }
                setupServers(body);
                if (body.proxy != null) {
                    String url = ApiClient.baseUrl().replaceAll("/$", "") + body.proxy;
                    MediaItem item = new MediaItem.Builder()
                            .setUri(url)
                            .setMimeType(MimeTypes.APPLICATION_M3U8)
                            .build();
                    HlsMediaSource source = new HlsMediaSource.Factory(new DefaultDataSource.Factory(PlayerActivity.this))
                            .createMediaSource(item);
                    player.setMediaSource(source);
                    player.prepare();
                    player.play();
                } else {
                    showMessage("Stream belum tersedia untuk judul ini.\nCoba lagi nanti atau pilih server lain.");
                    if (body.fallbackUrl != null) {
                        // tombol mirror hanya opsional, tidak otomatis membuka browser
                        final String fb = body.fallbackUrl;
                        android.widget.Button b = msgWrap.findViewById(R.id.btn_mirror);
                        b.setVisibility(View.VISIBLE);
                        b.setOnClickListener(v -> startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(fb))));
                    }
                }
            }

            @Override
            public void onFailure(@NonNull Call<PlayResponse> call, @NonNull Throwable t) {
                showMessage("Gagal memuat stream.\nPeriksa koneksi lalu coba lagi.");
            }
        });
    }

    private void setupServers(PlayResponse body) {
        if (body.servers == null || body.servers.size() <= 1) {
            serverSpinner.setVisibility(View.GONE);
            return;
        }
        if (spinnerReady) return;
        spinnerReady = true;
        List<String> labels = new ArrayList<>();
        for (com.nontongo.app.model.ServerItem s : body.servers) {
            labels.add(s.label != null ? s.label : ("Server " + s.index));
        }
        ArrayAdapter<String> a = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, labels);
        serverSpinner.setAdapter(a);
        serverSpinner.setVisibility(View.VISIBLE);
        serverSpinner.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener() {
            boolean first = true;

            @Override
            public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
                if (first) {
                    first = false;
                    return;
                }
                loadPlay(position);
            }

            @Override
            public void onNothingSelected(android.widget.AdapterView<?> parent) {}
        });
    }

    private int durationSec() {
        long d = player != null ? player.getDuration() : 0;
        return d > 0 ? (int) (d / 1000) : 0;
    }

    private void onEnded() {
        int dur = durationSec();
        saveHistory(dur, dur);

        if ("series".equalsIgnoreCase(type) && !episodes.isEmpty()) {
            int idx = -1;
            for (int i = 0; i < episodes.size(); i++) {
                if (episodes.get(i).slug != null && episodes.get(i).slug.equals(slug)) {
                    idx = i;
                    break;
                }
            }
            if (idx >= 0 && idx + 1 < episodes.size()) {
                Episode next = episodes.get(idx + 1);
                slug = next.slug;
                title = (title != null ? title.split(" E")[0] : slug) + " E" + next.episode;
                titleView.setText(title);
                spinnerReady = false;
                loadPlay(0);
            }
        }
    }

    private void saveHistory(int positionSec, int durationSec) {
        LocalHistory h = new LocalHistory();
        h.slug = slug;
        h.title = title;
        h.poster = poster;
        h.type = type;
        h.positionSec = positionSec;
        h.durationSec = durationSec;
        h.updatedAt = System.currentTimeMillis();
        Library.upsertHistory(this, h);
    }

    private final Runnable ticker = new Runnable() {
        @Override
        public void run() {
            if (player != null && player.isPlaying()) {
                long pos = player.getCurrentPosition() / 1000;
                if (pos - lastSaved >= 15) {
                    lastSaved = pos;
                    saveHistory((int) pos, durationSec());
                }
            }
            handler.postDelayed(this, 5000);
        }
    };

    private final Runnable hideBar = () -> {
        if (playerBar != null && msgWrap.getVisibility() != View.VISIBLE) playerBar.setVisibility(View.GONE);
    };

    private void showBar() {
        if (playerBar == null || msgWrap.getVisibility() == View.VISIBLE) return;
        playerBar.setVisibility(View.VISIBLE);
        handler.removeCallbacks(hideBar);
        handler.postDelayed(hideBar, 3500);
    }

    private void toggleBar() {
        if (playerBar == null) return;
        if (playerBar.getVisibility() == View.VISIBLE) {
            handler.removeCallbacks(hideBar);
            playerBar.setVisibility(View.GONE);
        } else {
            showBar();
        }
    }

    private void toggleFullscreen() {
        fullscreen = !fullscreen;
        if (fullscreen) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE);
            hideSystemUi();
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
            showSystemUi();
        }
    }

    private void hideSystemUi() {
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    private void showSystemUi() {
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override
    protected void onStart() {
        super.onStart();
        handler.postDelayed(ticker, 5000);
        showBar();
    }

    @Override
    protected void onStop() {
        super.onStop();
        handler.removeCallbacks(ticker);
        if (player != null && player.getCurrentPosition() > 0) {
            saveHistory((int) (player.getCurrentPosition() / 1000), durationSec());
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (player != null) {
            player.release();
            player = null;
        }
    }

    @Override
    public void onBackPressed() {
        if (fullscreen) {
            toggleFullscreen();
            return;
        }
        super.onBackPressed();
    }
}
