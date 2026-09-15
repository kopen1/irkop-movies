package com.nontongo.app.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.nontongo.app.R;
import com.nontongo.app.model.SuggestItem;

import java.util.ArrayList;
import java.util.List;

public class SimpleAdapter extends RecyclerView.Adapter<SimpleAdapter.VH> {

    public interface OnClick {
        void onClick(SuggestItem item);
    }

    private final List<SuggestItem> items = new ArrayList<>();
    private final OnClick listener;

    public SimpleAdapter(OnClick listener) {
        this.listener = listener;
    }

    public void setItems(List<SuggestItem> newItems) {
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
        SuggestItem s = items.get(position);
        String label = s.title != null ? s.title : "";
        if (s.year != null && !s.year.isEmpty()) label += "  (" + s.year + ")";
        h.text.setText(label);
        h.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onClick(s);
        });
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    static class VH extends RecyclerView.ViewHolder {
        final TextView text;

        VH(@NonNull View itemView) {
            super(itemView);
            text = itemView.findViewById(R.id.simple_text);
        }
    }
}
