package com.nontongo.app.fragment;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.nontongo.app.R;
import com.nontongo.app.adapter.PosterAdapter;
import com.nontongo.app.model.Page;
import com.nontongo.app.net.ApiClient;
import com.nontongo.app.util.Ui;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class PopularFragment extends Fragment {

    private RecyclerView grid;
    private ProgressBar progress;
    private TextView pageText;
    private Button prev, next;
    private PosterAdapter adapter;
    private int page = 1;
    private int totalPages = 1;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup parent, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_grid, parent, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        grid = view.findViewById(R.id.grid);
        progress = view.findViewById(R.id.progress);
        pageText = view.findViewById(R.id.page_text);
        prev = view.findViewById(R.id.btn_prev);
        next = view.findViewById(R.id.btn_next);

        grid.setLayoutManager(new GridLayoutManager(requireContext(), 2));
        adapter = new PosterAdapter(false, item -> Ui.openDetail(requireContext(), item));
        grid.setAdapter(adapter);

        prev.setOnClickListener(v -> load(page - 1));
        next.setOnClickListener(v -> load(page + 1));
        load(1);
    }

    private void load(int p) {
        if (p < 1 || p > totalPages) return;
        progress.setVisibility(View.VISIBLE);
        ApiClient.get().popular(p).enqueue(new Callback<Page>() {
            @Override
            public void onResponse(@NonNull Call<Page> call, @NonNull Response<Page> response) {
                progress.setVisibility(View.GONE);
                Page body = response.body();
                if (body == null) return;
                page = p;
                totalPages = Math.max(1, body.totalPages);
                adapter.setItems(body.items);
                pageText.setText("Halaman " + page + " dari " + totalPages);
                prev.setEnabled(page > 1);
                next.setEnabled(page < totalPages);
            }

            @Override
            public void onFailure(@NonNull Call<Page> call, @NonNull Throwable t) {
                progress.setVisibility(View.GONE);
            }
        });
    }
}
