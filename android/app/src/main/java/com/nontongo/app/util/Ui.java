package com.nontongo.app.util;

import android.content.Context;
import android.content.Intent;

import com.nontongo.app.ListActivity;
import com.nontongo.app.MainActivity;
import com.nontongo.app.PlayerActivity;
import com.nontongo.app.model.CatalogItem;

public final class Ui {

    private Ui() {}

    public static void openDetail(Context c, CatalogItem item) {
        openDetail(c, item.slug, parseId(item.id), item.title, item.poster, item.type, item.year);
    }

    public static void openDetail(Context c, String slug, int id, String title, String poster, String type, String year) {
        if (c instanceof MainActivity) {
            ((MainActivity) c).openDetail(slug, id, title, poster, type, year);
        }
    }

    public static void openPlayer(Context c, String slug, String title, String poster, String type) {
        Intent i = new Intent(c, PlayerActivity.class);
        i.putExtra("slug", slug);
        i.putExtra("title", title);
        i.putExtra("poster", poster);
        i.putExtra("type", type);
        c.startActivity(i);
    }

    /** mode: movie | series | year | country */
    public static void openList(Context c, String title, String mode) {
        if (c instanceof MainActivity) {
            ((MainActivity) c).openList(title, mode);
            return;
        }
        Intent i = new Intent(c, ListActivity.class);
        i.putExtra("title", title);
        i.putExtra("mode", mode);
        c.startActivity(i);
    }

    public static int parseId(String id) {
        if (id == null) return -1;
        try {
            return Integer.parseInt(id.trim());
        } catch (Exception e) {
            return -1;
        }
    }
}
