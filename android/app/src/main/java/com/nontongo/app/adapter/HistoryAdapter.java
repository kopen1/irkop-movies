package com.nontongo.app.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.nontongo.app.R;
import com.nontongo.app.model.LocalHistory;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class HistoryAdapter extends RecyclerView.Adapter<HistoryAdapter.VH> {

    public interface OnClick {
        void onClick(LocalHistory item);
    }

    private final List<LocalHistory> items = new ArrayList<>();
    private final OnClick listener;

    public HistoryAdapter(OnClick listener) {
        this.listener = listener;
    }

    public void setItems(List<LocalHistory> newItems) {
        items.clear();
        if (newItems != null) items.addAll(newItems);
        notifyDataSetChanged();
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_simple, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        LocalHistory it = items.get(position);
        String time = fmt(it.positionSec);
        String total = it.durationSec > 0 ? " / " + fmt(it.durationSec) : "";
        h.text.setText((it.title != null ? it.title : "") + "\n" + time + total);
        h.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onClick(it);
        });
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    private static String fmt(int sec) {
        if (sec <= 0) return "0:00";
        return String.format(Locale.US, "%d:%02d", sec / 60, sec % 60);
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView text;

        VH(@NonNull View itemView) {
            super(itemView);
            text = itemView.findViewById(R.id.simple_text);
        }
    }
}
