package com.nontongo.app;

import android.os.Bundle;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;

import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.nontongo.app.fragment.GenreFragment;
import com.nontongo.app.fragment.HomeFragment;
import com.nontongo.app.fragment.LibraryFragment;
import com.nontongo.app.fragment.PopularFragment;
import com.nontongo.app.fragment.SearchFragment;

public class MainActivity extends AppCompatActivity {

    private final Fragment home = new HomeFragment();
    private final Fragment popular = new PopularFragment();
    private final Fragment genre = new GenreFragment();
    private final Fragment search = new SearchFragment();
    private final Fragment library = new LibraryFragment();

    private Fragment current = home;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        BottomNavigationView nav = findViewById(R.id.bottom_nav);
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            Fragment target = home;
            if (id == R.id.nav_popular) target = popular;
            else if (id == R.id.nav_genre) target = genre;
            else if (id == R.id.nav_search) target = search;
            else if (id == R.id.nav_watchlist) target = library;
            show(target);
            return true;
        });

        show(home);
    }

    private void show(@NonNull Fragment target) {
        if (target == current) return;
        current = target;
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.fragment_container, target)
                .commit();
    }
}
