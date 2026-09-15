package com.nontongo.app.fragment;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.nontongo.app.Library;
import com.nontongo.app.R;
import com.nontongo.app.adapter.HistoryAdapter;
import com.nontongo.app.adapter.PosterAdapter;
import com.nontongo.app.model.LocalHistory;
import com.nontongo.app.util.Ui;

public class LibraryFragment extends Fragment {

    private RecyclerView list;
    private TextView empty;
    private Button tabWatch, tabHistory;
    private PosterAdapter watchAdapter;
    private HistoryAdapter historyAdapter;
    private boolean showHistory = false;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup parent, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_library, parent, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        list = view.findViewById(R.id.lib_list);
        empty = view.findViewById(R.id.lib_empty);
        tabWatch = view.findViewById(R.id.tab_watch);
        tabHistory = view.findViewById(R.id.tab_history);

        watchAdapter = new PosterAdapter(false, item -> Ui.openDetail(requireContext(), item));
        historyAdapter = new HistoryAdapter(item -> Ui.openDetail(requireContext(),
                item.slug, -1, item.title, item.poster, item.type, null));

        tabWatch.setOnClickListener(v -> {
            showHistory = false;
            render();
        });
        tabHistory.setOnClickListener(v -> {
            showHistory = true;
            render();
        });
        render();
    }

    @Override
    public void onResume() {
        super.onResume();
        render();
    }

    private void render() {
        if (list == null) return;
        if (showHistory) {
            list.setLayoutManager(new LinearLayoutManager(requireContext()));
            list.setAdapter(historyAdapter);
            java.util.List<LocalHistory> h = Library.getHistory(requireContext());
            historyAdapter.setItems(h);
            empty.setVisibility(h.isEmpty() ? View.VISIBLE : View.GONE);
            empty.setText("Belum ada riwayat.");
        } else {
            list.setLayoutManager(new GridLayoutManager(requireContext(), 2));
            list.setAdapter(watchAdapter);
            java.util.List<com.nontongo.app.model.CatalogItem> w = Library.getWatchlist(requireContext());
            watchAdapter.setItems(w);
            empty.setVisibility(w.isEmpty() ? View.VISIBLE : View.GONE);
            empty.setText("Belum ada film tersimpan.");
        }
    }
}
