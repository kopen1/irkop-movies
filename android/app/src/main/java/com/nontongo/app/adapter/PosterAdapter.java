package com.nontongo.app.adapter;

import android.graphics.drawable.ColorDrawable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.bumptech.glide.load.engine.DiskCacheStrategy;
import com.nontongo.app.R;
import com.nontongo.app.model.CatalogItem;

import java.util.ArrayList;
import java.util.List;

public class PosterAdapter extends RecyclerView.Adapter<PosterAdapter.VH> {

    public interface OnClick {
        void onClick(CatalogItem item);
    }

    private final List<CatalogItem> items = new ArrayList<>();
    private final OnClick listener;
    private final boolean rail;

    public PosterAdapter(boolean rail, OnClick listener) {
        this.rail = rail;
        this.listener = listener;
    }

    public void setItems(List<CatalogItem> newItems) {
        items.clear();
        if (newItems != null) items.addAll(newItems);
        notifyDataSetChanged();
    }

    public void addItems(List<CatalogItem> more) {
        if (more == null || more.isEmpty()) return;
        int start = items.size();
        items.addAll(more);
        notifyItemRangeInserted(start, more.size());
    }

    @NonNull
    @Override
    public VH onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View v = LayoutInflater.from(parent.getContext()).inflate(R.layout.item_poster, parent, false);
        return new VH(v);
    }

    @Override
    public void onBindViewHolder(@NonNull VH h, int position) {
        CatalogItem item = items.get(position);

        ViewGroup.LayoutParams lp = h.itemView.getLayoutParams();
        lp.width = rail ? dp(h.itemView, 118) : ViewGroup.LayoutParams.MATCH_PARENT;
        h.itemView.setLayoutParams(lp);

        h.title.setText(item.title != null ? item.title : "");
        h.year.setText(item.year != null ? item.year : "");

        if (item.rating != null && item.rating > 0) {
            h.rating.setVisibility(View.VISIBLE);
            h.rating.setText("★ " + String.format(java.util.Locale.US, "%.1f", item.rating));
        } else {
            h.rating.setVisibility(View.GONE);
        }

        Glide.with(h.poster.getContext())
                .load(item.poster)
                .placeholder(new ColorDrawable(0xFF2F3A52))
                .error(new ColorDrawable(0xFF2F3A52))
                .diskCacheStrategy(DiskCacheStrategy.AUTOMATIC)
                .centerCrop()
                .into(h.poster);

        h.itemView.setOnClickListener(v -> {
            if (listener != null) listener.onClick(item);
        });
    }

    @Override
    public int getItemCount() {
        return items.size();
    }

    private static int dp(View v, int value) {
        return Math.round(value * v.getResources().getDisplayMetrics().density);
    }

    static class VH extends RecyclerView.ViewHolder {
        final ImageView poster;
        final TextView title;
        final TextView year;
        final TextView rating;

        VH(@NonNull View itemView) {
            super(itemView);
            poster = itemView.findViewById(R.id.poster);
            title = itemView.findViewById(R.id.title);
            year = itemView.findViewById(R.id.year);
            rating = itemView.findViewById(R.id.rating);
        }
    }
}
