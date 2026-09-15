package com.nontongo.app.fragment;

import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.TextWatcher;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.ProgressBar;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.nontongo.app.R;
import com.nontongo.app.adapter.PosterAdapter;
import com.nontongo.app.adapter.SimpleAdapter;
import com.nontongo.app.model.Page;
import com.nontongo.app.model.SuggestResponse;
import com.nontongo.app.net.ApiClient;
import com.nontongo.app.util.Ui;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class SearchFragment extends Fragment {

    private EditText input;
    private RecyclerView suggestionsView;
    private RecyclerView resultsView;
    private ProgressBar progress;

    private SimpleAdapter suggestionsAdapter;
    private PosterAdapter resultsAdapter;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable pendingSuggest;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup parent, @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_search, parent, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        input = view.findViewById(R.id.search_input);
        suggestionsView = view.findViewById(R.id.suggestions);
        resultsView = view.findViewById(R.id.results);
        progress = view.findViewById(R.id.search_progress);

        suggestionsAdapter = new SimpleAdapter(s -> Ui.openDetail(requireContext(),
                s.slug, s.post_id != null ? s.post_id : -1, s.title, s.poster, s.type, s.year));
        suggestionsView.setLayoutManager(new LinearLayoutManager(requireContext()));
        suggestionsView.setAdapter(suggestionsAdapter);

        resultsAdapter = new PosterAdapter(false, item -> Ui.openDetail(requireContext(), item));
        resultsView.setLayoutManager(new GridLayoutManager(requireContext(), 2));
        resultsView.setAdapter(resultsAdapter);

        input.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEARCH) {
                hideKeyboard();
                doSearch(input.getText().toString().trim());
                return true;
            }
            return false;
        });

        input.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b, int c) {}
            @Override public void onTextChanged(CharSequence s, int a, int b, int c) {}
            @Override public void afterTextChanged(Editable s) {
                scheduleSuggest(s.toString().trim());
            }
        });
    }

    private void scheduleSuggest(String q) {
        if (pendingSuggest != null) handler.removeCallbacks(pendingSuggest);
        if (q.length() < 2) {
            suggestionsView.setVisibility(View.GONE);
            return;
        }
        pendingSuggest = () -> ApiClient.get().suggest(q).enqueue(new Callback<SuggestResponse>() {
            @Override
            public void onResponse(@NonNull Call<SuggestResponse> call, @NonNull Response<SuggestResponse> response) {
                SuggestResponse body = response.body();
                if (body == null || body.items == null || body.items.isEmpty()) {
                    suggestionsView.setVisibility(View.GONE);
                } else {
                    suggestionsAdapter.setItems(body.items);
                    suggestionsView.setVisibility(View.VISIBLE);
                }
            }

            @Override
            public void onFailure(@NonNull Call<SuggestResponse> call, @NonNull Throwable t) {
                suggestionsView.setVisibility(View.GONE);
            }
        });
        handler.postDelayed(pendingSuggest, 300);
    }

    private void doSearch(String q) {
        if (q.isEmpty()) return;
        suggestionsView.setVisibility(View.GONE);
        progress.setVisibility(View.VISIBLE);
        ApiClient.get().search(q, 1, "", "").enqueue(new Callback<Page>() {
            @Override
            public void onResponse(@NonNull Call<Page> call, @NonNull Response<Page> response) {
                progress.setVisibility(View.GONE);
                Page body = response.body();
                resultsAdapter.setItems(body != null ? body.items : null);
            }

            @Override
            public void onFailure(@NonNull Call<Page> call, @NonNull Throwable t) {
                progress.setVisibility(View.GONE);
            }
        });
    }

    private void hideKeyboard() {
        android.view.inputmethod.InputMethodManager imm =
                (android.view.inputmethod.InputMethodManager) requireContext().getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
        if (imm != null) imm.hideSoftInputFromWindow(input.getWindowToken(), 0);
    }
}
