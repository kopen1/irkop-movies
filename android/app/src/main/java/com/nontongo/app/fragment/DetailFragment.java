package com.nontongo.app.fragment;

import android.content.Intent;
import android.graphics.drawable.ColorDrawable;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.nontongo.app.Library;
import com.nontongo.app.R;
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

public class DetailFragment extends Fragment {

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

    public static DetailFragment newInstance(String slug, int id, String title, String poster, String type, String year) {
        DetailFragment f = new DetailFragment();
        Bundle b = new Bundle();
        b.putString("slug", slug);
        b.putInt("id", id);
        b.putString("title", title);
        b.putString("poster", poster);
        b.putString("type", type);
        b.putString("year", year);
        f.setArguments(b);
        return f;
    }

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup parent, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.activity_detail, parent, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        poster = view.findViewById(R.id.d_poster);
        title = view.findViewById(R.id.d_title);
        meta = view.findViewById(R.id.d_meta);
        synopsis = view.findViewById(R.id.d_synopsis);
        epHeader = view.findViewById(R.id.d_ep_header);
        relatedHeader = view.findViewById(R.id.d_related_header);
        seasonsWrap = view.findViewById(R.id.d_seasons_wrap);
        seasons = view.findViewById(R.id.d_seasons);
        episodesView = view.findViewById(R.id.d_episodes);
        relatedView = view.findViewById(R.id.d_related);
        progress = view.findViewById(R.id.d_progress);

        Bundle a = getArguments();
        if (a != null) {
            slug = a.getString("slug");
            id = a.getInt("id", -1);
            type = a.getString("type");
            title.setText(a.getString("title", slug));
            meta.setText(a.getString("year", ""));
            Glide.with(this).load(a.getString("poster")).placeholder(new ColorDrawable(0xFF2F3A52)).into(poster);
        }

        episodeAdapter = new EpisodeAdapter(this::playEpisode);
        episodesView.setLayoutManager(new GridLayoutManager(requireContext(), 4));
        episodesView.setAdapter(episodeAdapter);

        relatedAdapter = new PosterAdapter(false, item -> Ui.openDetail(requireContext(), item));
        relatedView.setLayoutManager(new GridLayoutManager(requireContext(), 2));
        relatedView.setAdapter(relatedAdapter);

        view.findViewById(R.id.d_play).setOnClickListener(v -> playCurrent());
        view.findViewById(R.id.d_watch).setOnClickListener(v -> toggleWatch());
        view.findViewById(R.id.d_share).setOnClickListener(v -> share());

        loadDetail();
    }

    private void loadDetail() {
        progress.setVisibility(View.VISIBLE);
        ApiClient.get().detail(slug, id > 0 ? id : null).enqueue(new Callback<DetailData>() {
            @Override
            public void onResponse(@NonNull Call<DetailData> call, @NonNull Response<DetailData> response) {
                progress.setVisibility(View.GONE);
                detail = response.body();
                if (detail == null || !isAdded()) return;

                title.setText(detail.title != null ? detail.title : slug);
                type = detail.type != null ? detail.type : type;
                Glide.with(DetailFragment.this).load(detail.poster).placeholder(new ColorDrawable(0xFF2F3A52)).into(poster);

                StringBuilder m = new StringBuilder();
                if (detail.rating != null) m.append("★ ").append(String.format(java.util.Locale.US, "%.1f", detail.rating)).append("   ");
                if (detail.year != null) m.append(detail.year).append("   ");
                if (detail.type != null) m.append(detail.type).append("   ");
                if (detail.runtime != null) m.append(detail.runtime);
                meta.setText(m.toString());

                synopsis.setText((detail.overview != null && !detail.overview.isEmpty())
                        ? detail.overview : getString(R.string.no_synopsis));

                if ("series".equalsIgnoreCase(detail.type)) loadEpisodes();
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
                if (body == null || body.items == null || body.items.isEmpty() || !isAdded()) return;
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
                        com.google.android.material.button.MaterialButton b =
                                new com.google.android.material.button.MaterialButton(requireContext());
                        b.setText("Season " + s);
                        b.setAllCaps(false);
                        b.setTextSize(12);
                        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF2F3A52));
                        b.setStrokeColor(android.content.res.ColorStateList.valueOf(0xFF47546F));
                        b.setStrokeWidth(2);
                        b.setCornerRadius(20);
                        b.setTextColor(0xFFF2F6FD);
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
        Ui.openPlayer(requireContext(), s, tt, pp, type);
    }

    private void playEpisode(Episode episode) {
        String tt = (detail != null ? detail.title : title.getText().toString()) + " E" + episode.episode;
        Ui.openPlayer(requireContext(), episode.slug, tt, detail != null ? detail.poster : null, "series");
    }

    private void toggleWatch() {
        CatalogItem item = new CatalogItem();
        item.slug = detail != null ? detail.slug : slug;
        item.title = detail != null ? detail.title : title.getText().toString();
        item.poster = detail != null ? detail.poster : null;
        item.type = type;
        item.id = (detail != null && detail.postId != null) ? String.valueOf(detail.postId) : null;

        if (Library.isWatched(requireContext(), item.slug)) {
            Library.removeWatch(requireContext(), item.slug);
            toast("Dihapus dari watchlist");
        } else {
            Library.addWatch(requireContext(), item);
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
        Toast.makeText(requireContext(), s, Toast.LENGTH_SHORT).show();
    }
}
