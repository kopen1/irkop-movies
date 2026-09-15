package com.nontongo.app;

import android.content.Intent;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.nontongo.app.adapter.EpisodeAdapter;
import com.nontongo.app.adapter.PosterAdapter;
import com.nontongo.app.model.CatalogItem;
import com.nontongo.app.model.DetailData;
import com.nontongo.app.model.Episode;
import com.nontongo.app.model.EpisodesResponse;
import com.nontongo.app.model.Page;
import com.nontongo.app.net.ApiClient;
import com.nontongo.app.util.Ui;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class DetailActivity extends AppCompatActivity {

    private ImageView poster;
    private TextView title, meta, synopsis, epHeader, relatedHeader;
    private View seasonsWrap;
    private LinearLayout seasons;
    private RecyclerView episodesView, relatedView;
    private ProgressBar progress;

    private String slug;
    private int id = -1;
    private String type;

    private DetailData detail;
    private final List<Episode> allEpisodes = new ArrayList<>();
    private EpisodeAdapter episodeAdapter;
    private PosterAdapter relatedAdapter;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_detail);

        poster = findViewById(R.id.d_poster);
        title = findViewById(R.id.d_title);
        meta = findViewById(R.id.d_meta);
        synopsis = findViewById(R.id.d_synopsis);
        epHeader = findViewById(R.id.d_ep_header);
        relatedHeader = findViewById(R.id.d_related_header);
        seasonsWrap = findViewById(R.id.d_seasons_wrap);
        seasons = findViewById(R.id.d_seasons);
        episodesView = findViewById(R.id.d_episodes);
        relatedView = findViewById(R.id.d_related);
        progress = findViewById(R.id.d_progress);

        slug = getIntent().getStringExtra("slug");
        id = getIntent().getIntExtra("id", -1);
        type = getIntent().getStringExtra("type");
        String titleExtra = getIntent().getStringExtra("title");
        String posterExtra = getIntent().getStringExtra("poster");
        String yearExtra = getIntent().getStringExtra("year");

        title.setText(titleExtra != null ? titleExtra : slug);
        meta.setText(yearExtra != null ? yearExtra : "");
        Glide.with(this).load(posterExtra).placeholder(new ColorDrawable(0xFF2F3A52)).into(poster);

        episodeAdapter = new EpisodeAdapter(this::playEpisode);
        episodesView.setLayoutManager(new GridLayoutManager(this, 4));
        episodesView.setAdapter(episodeAdapter);

        relatedAdapter = new PosterAdapter(false, item -> Ui.openDetail(this, item));
        relatedView.setLayoutManager(new GridLayoutManager(this, 2));
        relatedView.setAdapter(relatedAdapter);

        findViewById(R.id.d_play).setOnClickListener(v -> playCurrent());
        findViewById(R.id.d_watch).setOnClickListener(v -> toggleWatch());
        findViewById(R.id.d_share).setOnClickListener(v -> share());

        loadDetail();
    }

    private void loadDetail() {
        progress.setVisibility(View.VISIBLE);
        ApiClient.get().detail(slug, id > 0 ? id : null).enqueue(new Callback<DetailData>() {
            @Override
            public void onResponse(@NonNull Call<DetailData> call, @NonNull Response<DetailData> response) {
                progress.setVisibility(View.GONE);
                detail = response.body();
                if (detail == null) return;

                title.setText(detail.title != null ? detail.title : slug);
                type = detail.type != null ? detail.type : type;
                Glide.with(DetailActivity.this).load(detail.poster).placeholder(new ColorDrawable(0xFF2F3A52)).into(poster);

                StringBuilder m = new StringBuilder();
                if (detail.rating != null) m.append("★ ").append(String.format(java.util.Locale.US, "%.1f", detail.rating)).append("   ");
                if (detail.year != null) m.append(detail.year).append("   ");
                if (detail.type != null) m.append(detail.type).append("   ");
                if (detail.runtime != null) m.append(detail.runtime);
                meta.setText(m.toString());

                synopsis.setText((detail.overview != null && !detail.overview.isEmpty())
                        ? detail.overview : getString(R.string.no_synopsis));

                if ("series".equalsIgnoreCase(detail.type)) {
                    loadEpisodes();
                }
                loadRelated();
            }

            @Override
            public void onFailure(@NonNull Call<DetailData> call, @NonNull Throwable t) {
                progress.setVisibility(View.GONE);
            }
        });
    }

    private void loadEpisodes() {
        ApiClient.get().episodes(slug).enqueue(new Callback<EpisodesResponse>() {
            @Override
            public void onResponse(@NonNull Call<EpisodesResponse> call, @NonNull Response<EpisodesResponse> response) {
                EpisodesResponse body = response.body();
                if (body == null || body.items == null || body.items.isEmpty()) return;
                allEpisodes.clear();
                allEpisodes.addAll(body.items);
                epHeader.setVisibility(View.VISIBLE);
                episodesView.setVisibility(View.VISIBLE);

                Map<Integer, Integer> bySeason = new LinkedHashMap<>();
                for (Episode e : allEpisodes) {
                    Integer c = bySeason.get(e.season);
                    bySeason.put(e.season, c == null ? 1 : c + 1);
                }

                Integer[] seasonKeys = bySeason.keySet().toArray(new Integer[0]);
                if (seasonKeys.length > 1) {
                    seasonsWrap.setVisibility(View.VISIBLE);
                    seasons.removeAllViews();
                    for (Integer s : seasonKeys) {
                        Button b = new Button(DetailActivity.this);
                        b.setText("Season " + s);
                        b.setAllCaps(false);
                        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                                LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
                        lp.setMargins(0, 0, 8, 0);
                        b.setLayoutParams(lp);
                        b.setOnClickListener(v -> showSeason(s));
                        seasons.addView(b);
                    }
                }
                showSeason(seasonKeys[0]);
            }

            @Override
            public void onFailure(@NonNull Call<EpisodesResponse> call, @NonNull Throwable t) {}
        });
    }

    private void showSeason(int season) {
        List<Episode> filtered = new ArrayList<>();
        for (Episode e : allEpisodes) {
            if (e.season == season) filtered.add(e);
        }
        episodeAdapter.setItems(filtered);
    }

    private void loadRelated() {
        if (detail == null || detail.postId == null) return;
        String t = "series".equalsIgnoreCase(detail.type) ? "series" : "movie";
        ApiClient.get().related(String.valueOf(detail.postId), t).enqueue(new Callback<Page>() {
            @Override
            public void onResponse(@NonNull Call<Page> call, @NonNull Response<Page> response) {
                Page body = response.body();
                if (body == null || body.items == null || body.items.isEmpty()) return;
                relatedHeader.setVisibility(View.VISIBLE);
                relatedAdapter.setItems(body.items);
            }

            @Override
            public void onFailure(@NonNull Call<Page> call, @NonNull Throwable t) {}
        });
    }

    private void playCurrent() {
        String s = detail != null ? detail.slug : slug;
        String tt = detail != null ? detail.title : title.getText().toString();
        String pp = detail != null ? detail.poster : null;
        Ui.openPlayer(this, s, tt, pp, type);
    }

    private void playEpisode(Episode episode) {
        String tt = (detail != null ? detail.title : title.getText().toString()) + " E" + episode.episode;
        Ui.openPlayer(this, episode.slug, tt, detail != null ? detail.poster : null, "series");
    }

    private void toggleWatch() {
        CatalogItem item = new CatalogItem();
        item.slug = detail != null ? detail.slug : slug;
        item.title = detail != null ? detail.title : title.getText().toString();
        item.poster = detail != null ? detail.poster : null;
        item.type = type;
        item.id = (detail != null && detail.postId != null) ? String.valueOf(detail.postId) : null;

        if (Library.isWatched(this, item.slug)) {
            Library.removeWatch(this, item.slug);
            toast("Dihapus dari watchlist");
        } else {
            Library.addWatch(this, item);
            toast("Ditambahkan ke watchlist");
        }
    }

    private void share() {
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_TEXT, ApiClient.baseUrl() + "detail/" + slug);
        startActivity(Intent.createChooser(i, "Bagikan"));
    }

    private void toast(String s) {
        Toast.makeText(this, s, Toast.LENGTH_SHORT).show();
    }
}
