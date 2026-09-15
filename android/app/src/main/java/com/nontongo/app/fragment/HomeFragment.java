package com.nontongo.app.fragment;

import android.os.Bundle;
import android.util.TypedValue;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.nontongo.app.Library;
import com.nontongo.app.R;
import com.nontongo.app.adapter.PosterAdapter;
import com.nontongo.app.model.CatalogItem;
import com.nontongo.app.model.Page;
import com.nontongo.app.net.ApiClient;
import com.nontongo.app.util.Ui;

import java.util.ArrayList;
import java.util.List;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class HomeFragment extends Fragment {

    private LinearLayout container;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup parent, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_home, parent, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        container = view.findViewById(R.id.home_container);

        // Baris navigasi katalog
        LinearLayout navRow = new LinearLayout(requireContext());
        navRow.setOrientation(LinearLayout.HORIZONTAL);
        navRow.setPadding(dp(8), dp(4), dp(8), dp(4));
        addNavButton(navRow, "🎬 Film", "movie");
        addNavButton(navRow, "📺 Series", "series");
        addNavButton(navRow, "📅 Tahun", "year");
        addNavButton(navRow, "🌍 Negara", "country");
        container.addView(navRow);

        // Lanjutkan Menonton (lokal)
        List<CatalogItem> cont = new ArrayList<>();
        for (com.nontongo.app.model.LocalHistory h : Library.getHistory(requireContext())) {
            if (h.positionSec > 0 && !(h.durationSec > 0 && h.positionSec >= h.durationSec - 10)) {
                CatalogItem c = new CatalogItem();
                c.slug = h.slug;
                c.title = h.title;
                c.poster = h.poster;
                c.type = h.type;
                c.progress = h.durationSec > 0 ? (int) (h.positionSec * 100L / h.durationSec) : 0;
                cont.add(c);
            }
            if (cont.size() >= 10) break;
        }
        if (!cont.isEmpty()) addSection(getString(R.string.continue_watching), cont);

        loadSection("🔥 Trending Hari Ini", ApiClient.get().trending());
        loadSection("⭐ Rating Tertinggi", ApiClient.get().top());
        loadSection("🎯 Action", ApiClient.get().genre("action", 1));
        loadSection("💧 Drama", ApiClient.get().genre("drama", 1));
        loadSection("👻 Horror", ApiClient.get().genre("horror", 1));
    }

    private void loadSection(String title, Call<Page> call) {
        call.enqueue(new Callback<Page>() {
            @Override
            public void onResponse(@NonNull Call<Page> call, @NonNull Response<Page> response) {
                Page page = response.body();
                if (page != null && page.items != null && !page.items.isEmpty()) {
                    addSection(title, page.items);
                }
            }

            @Override
            public void onFailure(@NonNull Call<Page> call, @NonNull Throwable t) {
                // diamkan
            }
        });
    }

    private void addSection(String title, List<CatalogItem> items) {
        if (container == null) return;

        TextView header = new TextView(requireContext());
        header.setText(title);
        header.setTextColor(0xFFF2F6FD);
        header.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        header.setTypeface(null, android.graphics.Typeface.BOLD);
        int pad = dp(12);
        header.setPadding(pad, pad, pad, dp(4));
        container.addView(header);

        RecyclerView rv = new RecyclerView(requireContext());
        rv.setLayoutManager(new LinearLayoutManager(requireContext(), RecyclerView.HORIZONTAL, false));
        rv.setClipToPadding(false);
        rv.setPadding(pad, 0, pad, dp(8));
        PosterAdapter adapter = new PosterAdapter(true, item -> Ui.openDetail(requireContext(), item));
        rv.setAdapter(adapter);
        adapter.setItems(items);

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        container.addView(rv, lp);
    }

    private void addNavButton(LinearLayout row, String label, String mode) {
        com.google.android.material.button.MaterialButton b =
                new com.google.android.material.button.MaterialButton(requireContext());
        b.setText(label);
        b.setAllCaps(false);
        b.setTextSize(12);
        b.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF2F3A52));
        b.setStrokeColor(android.content.res.ColorStateList.valueOf(0xFF47546F));
        b.setStrokeWidth(dp(1));
        b.setCornerRadius(dp(10));
        b.setTextColor(0xFFF2F6FD);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f);
        lp.setMargins(4, 0, 4, 0);
        b.setLayoutParams(lp);
        b.setOnClickListener(v -> Ui.openList(requireContext(), label.replaceAll("[^A-Za-z ]", "").trim(), mode));
        row.addView(b);
    }

    private int dp(int v) {
        return Math.round(v * getResources().getDisplayMetrics().density);
    }
}
