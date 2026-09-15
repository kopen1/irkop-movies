package com.nontongo.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.common.Player;
import androidx.media3.exoplayer.ExoPlayer;
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

    private String slug;
    private String title;
    private String poster;
    private String type;

    private final List<Episode> episodes = new ArrayList<>();
    private int serverIndex = 0;
    private boolean spinnerReady = false;

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
        ImageView close = findViewById(R.id.btn_close);

        slug = getIntent().getStringExtra("slug");
        title = getIntent().getStringExtra("title");
        poster = getIntent().getStringExtra("poster");
        type = getIntent().getStringExtra("type");
        titleView.setText(title != null ? title : slug);

        close.setOnClickListener(v -> finish());

        player = new ExoPlayer.Builder(this).build();
        playerView.setPlayer(player);
        player.addListener(new Player.Listener() {
            @Override
            public void onPlaybackStateChanged(int state) {
                if (state == Player.STATE_ENDED) onEnded();
            }
        });

        if ("series".equalsIgnoreCase(type)) {
            loadEpisodes();
        }
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

    private void loadPlay(int server) {
        progress.setVisibility(View.VISIBLE);
        ApiClient.get().play(slug, server > 0 ? server : null).enqueue(new Callback<PlayResponse>() {
            @Override
            public void onResponse(@NonNull Call<PlayResponse> call, @NonNull Response<PlayResponse> response) {
                PlayResponse body = response.body();
                if (body == null) {
                    progress.setVisibility(View.GONE);
                    return;
                }
                setupServers(body);
                if (body.proxy != null) {
                    String url = ApiClient.baseUrl().replaceAll("/$", "") + body.proxy;
                    player.setMediaItem(MediaItem.fromUri(url));
                    player.prepare();
                    player.play();
                } else if (body.fallbackUrl != null) {
                    progress.setVisibility(View.GONE);
                    startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(body.fallbackUrl)));
                    finish();
                } else {
                    progress.setVisibility(View.GONE);
                    Toast.makeText(PlayerActivity.this, "Stream tidak tersedia", Toast.LENGTH_SHORT).show();
                }
            }

            @Override
            public void onFailure(@NonNull Call<PlayResponse> call, @NonNull Throwable t) {
                progress.setVisibility(View.GONE);
                Toast.makeText(PlayerActivity.this, "Gagal memuat stream", Toast.LENGTH_SHORT).show();
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
                serverIndex = position;
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
        saveHistory(dur, dur); // selesai -> keluar dari "Lanjutkan Menonton"

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
                serverIndex = 0;
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

    @Override
    protected void onStart() {
        super.onStart();
        handler.postDelayed(ticker, 5000);
        hideSystemUi();
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
        super.onBackPressed();
        finish();
    }

    private void hideSystemUi() {
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }
}
