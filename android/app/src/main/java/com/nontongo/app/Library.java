package com.nontongo.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.nontongo.app.model.CatalogItem;
import com.nontongo.app.model.LocalHistory;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;

/** Penyimpanan lokal (watchlist & riwayat) — tanpa login. */
public final class Library {
    private static final String PREF = "nontongo_library";
    private static final String KEY_WATCH = "watchlist";
    private static final String KEY_HISTORY = "history";

    private static final Gson GSON = new Gson();
    private static final Type WATCH_TYPE = new TypeToken<List<CatalogItem>>() {}.getType();
    private static final Type HISTORY_TYPE = new TypeToken<List<LocalHistory>>() {}.getType();

    private Library() {}

    private static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREF, Context.MODE_PRIVATE);
    }

    public static List<CatalogItem> getWatchlist(Context c) {
        String json = prefs(c).getString(KEY_WATCH, null);
        if (json == null) return new ArrayList<>();
        List<CatalogItem> list = GSON.fromJson(json, WATCH_TYPE);
        return list != null ? list : new ArrayList<>();
    }

    public static boolean isWatched(Context c, String slug) {
        for (CatalogItem i : getWatchlist(c)) {
            if (i.slug != null && i.slug.equals(slug)) return true;
        }
        return false;
    }

    public static void addWatch(Context c, CatalogItem item) {
        List<CatalogItem> list = getWatchlist(c);
        Iterator<CatalogItem> it = list.iterator();
        while (it.hasNext()) {
            CatalogItem x = it.next();
            if (x.slug != null && x.slug.equals(item.slug)) it.remove();
        }
        list.add(0, item);
        if (list.size() > 200) list = new ArrayList<>(list.subList(0, 200));
        prefs(c).edit().putString(KEY_WATCH, GSON.toJson(list)).apply();
    }

    public static void removeWatch(Context c, String slug) {
        List<CatalogItem> list = getWatchlist(c);
        Iterator<CatalogItem> it = list.iterator();
        while (it.hasNext()) {
            CatalogItem x = it.next();
            if (x.slug != null && x.slug.equals(slug)) it.remove();
        }
        prefs(c).edit().putString(KEY_WATCH, GSON.toJson(list)).apply();
    }

    public static List<LocalHistory> getHistory(Context c) {
        String json = prefs(c).getString(KEY_HISTORY, null);
        if (json == null) return new ArrayList<>();
        List<LocalHistory> list = GSON.fromJson(json, HISTORY_TYPE);
        return list != null ? list : new ArrayList<>();
    }

    public static void upsertHistory(Context c, LocalHistory h) {
        List<LocalHistory> list = getHistory(c);
        Iterator<LocalHistory> it = list.iterator();
        while (it.hasNext()) {
            LocalHistory x = it.next();
            if (x.slug != null && x.slug.equals(h.slug)) it.remove();
        }
        list.add(0, h);
        if (list.size() > 200) list = new ArrayList<>(list.subList(0, 200));
        prefs(c).edit().putString(KEY_HISTORY, GSON.toJson(list)).apply();
    }

    public static void removeHistory(Context c, String slug) {
        List<LocalHistory> list = getHistory(c);
        Iterator<LocalHistory> it = list.iterator();
        while (it.hasNext()) {
            LocalHistory x = it.next();
            if (x.slug != null && x.slug.equals(slug)) it.remove();
        }
        prefs(c).edit().putString(KEY_HISTORY, GSON.toJson(list)).apply();
    }
}
