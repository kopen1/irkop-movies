package com.nontongo.app;

import android.os.Bundle;
import android.view.View;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ProgressBar;
import android.widget.Spinner;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.nontongo.app.adapter.PosterAdapter;
import com.nontongo.app.model.Page;
import com.nontongo.app.net.ApiClient;
import com.nontongo.app.util.Ui;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class ListActivity extends AppCompatActivity {

    private RecyclerView grid;
    private ProgressBar progress;
    private TextView pageText, titleView;
    private Button prev, next;
    private View filterRow;
    private Spinner spinner;
    private PosterAdapter adapter;

    private String mode = "movie";
    private int page = 1;
    private int totalPages = 1;

    private static final String[] YEARS = {"2026", "2025", "2024", "2023", "2022", "2021", "2020", "2019", "2018", "2017", "2016", "2015"};
    private static final String[] COUNTRY_CODES = {"usa", "south-korea", "japan", "china", "india", "uk", "france", "thailand", "indonesia", "malaysia"};
    private static final String[] COUNTRY_LABELS = {"USA", "Korea", "Jepang", "China", "India", "Inggris", "Prancis", "Thailand", "Indonesia", "Malaysia"};

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_list);

        titleView = findViewById(R.id.list_title);
        grid = findViewById(R.id.grid);
        progress = findViewById(R.id.progress);
        pageText = findViewById(R.id.page_text);
        prev = findViewById(R.id.btn_prev);
        next = findViewById(R.id.btn_next);
        filterRow = findViewById(R.id.filter_row);
        spinner = findViewById(R.id.filter_spinner);

        mode = getIntent().getStringExtra("mode");
        if (mode == null) mode = "movie";
        String title = getIntent().getStringExtra("title");
        titleView.setText(title != null ? title : "Daftar");

        grid.setLayoutManager(new GridLayoutManager(this, 2));
        adapter = new PosterAdapter(false, item -> Ui.openDetail(this, item));
        grid.setAdapter(adapter);

        if ("year".equals(mode)) {
            filterRow.setVisibility(View.VISIBLE);
            ArrayAdapter<String> a = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, YEARS);
            spinner.setAdapter(a);
            spinner.setOnItemSelectedListener(new SimpleItemSelected(() -> load(1)));
        } else if ("country".equals(mode)) {
            filterRow.setVisibility(View.VISIBLE);
            ArrayAdapter<String> a = new ArrayAdapter<>(this, android.R.layout.simple_spinner_dropdown_item, COUNTRY_LABELS);
            spinner.setAdapter(a);
            spinner.setOnItemSelectedListener(new SimpleItemSelected(() -> load(1)));
        }

        prev.setOnClickListener(v -> load(page - 1));
        next.setOnClickListener(v -> load(page + 1));
        load(1);
    }

    private Call<Page> call(int p) {
        switch (mode) {
            case "series":
                return ApiClient.get().list("series", p);
            case "year":
                return ApiClient.get().year(YEARS[Math.max(0, spinner.getSelectedItemPosition())], p);
            case "country":
                return ApiClient.get().country(COUNTRY_CODES[Math.max(0, spinner.getSelectedItemPosition())], p);
            default:
                return ApiClient.get().list("movie", p);
        }
    }

    private void load(int p) {
        if (p < 1 || p > totalPages) return;
        progress.setVisibility(View.VISIBLE);
        call(p).enqueue(new Callback<Page>() {
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

    /** Helper kecil untuk spinner selection. */
    private static class SimpleItemSelected implements android.widget.AdapterView.OnItemSelectedListener {
        private final Runnable onSelect;
        private boolean first = true;

        SimpleItemSelected(Runnable onSelect) {
            this.onSelect = onSelect;
        }

        @Override
        public void onItemSelected(android.widget.AdapterView<?> parent, View view, int position, long id) {
            if (first) {
                first = false;
                return;
            }
            onSelect.run();
        }

        @Override
        public void onNothingSelected(android.widget.AdapterView<?> parent) {}
    }
}
