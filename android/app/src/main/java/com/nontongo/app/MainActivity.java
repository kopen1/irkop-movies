package com.nontongo.app;

import android.content.Intent;
import android.os.Bundle;
import android.view.MenuItem;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.view.GravityCompat;
import androidx.drawerlayout.widget.DrawerLayout;
import androidx.fragment.app.Fragment;

import com.google.android.material.appbar.MaterialToolbar;
import com.google.android.material.bottomnavigation.BottomNavigationView;
import com.google.android.material.navigation.NavigationView;
import com.nontongo.app.fragment.DetailFragment;
import com.nontongo.app.fragment.GenreFragment;
import com.nontongo.app.fragment.HomeFragment;
import com.nontongo.app.fragment.LibraryFragment;
import com.nontongo.app.fragment.PopularFragment;
import com.nontongo.app.fragment.SearchFragment;

public class MainActivity extends AppCompatActivity {

    private DrawerLayout drawer;
    private Fragment home, popular, genre, search, library;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        drawer = findViewById(R.id.drawer);
        MaterialToolbar topbar = findViewById(R.id.topbar);
        topbar.setNavigationOnClickListener(v -> drawer.openDrawer(GravityCompat.START));

        home = new HomeFragment();
        popular = new PopularFragment();
        genre = new GenreFragment();
        search = new SearchFragment();
        library = new LibraryFragment();

        NavigationView navView = findViewById(R.id.nav_view);
        navView.setNavigationItemSelectedListener(this::onDrawerItem);

        BottomNavigationView nav = findViewById(R.id.bottom_nav);
        nav.setOnItemSelectedListener(item -> {
            int id = item.getItemId();
            if (id == R.id.nav_popular) showRoot(popular);
            else if (id == R.id.nav_genre) showRoot(genre);
            else if (id == R.id.nav_search) showRoot(search);
            else if (id == R.id.nav_watchlist) showRoot(library);
            else showRoot(home);
            return true;
        });

        showRoot(home);
    }

    private boolean onDrawerItem(@NonNull MenuItem item) {
        int id = item.getItemId();
        if (id == R.id.drawer_home) showRoot(home);
        else if (id == R.id.drawer_popular) showRoot(popular);
        else if (id == R.id.drawer_genre) showRoot(genre);
        else if (id == R.id.drawer_movies) openList("Film", "movie");
        else if (id == R.id.drawer_series) openList("Series", "series");
        else if (id == R.id.drawer_year) openList("Tahun", "year");
        else if (id == R.id.drawer_country) openList("Negara", "country");
        else if (id == R.id.drawer_watchlist) showRoot(library);
        else if (id == R.id.drawer_history) showRoot(library);
        drawer.closeDrawers();
        return true;
    }

    /** Tampilkan fragment root (bersihkan back stack detail). */
    private void showRoot(Fragment target) {
        getSupportFragmentManager().popBackStack(null, androidx.fragment.app.FragmentManager.POP_BACK_STACK_INCLUSIVE);
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.fragment_container, target)
                .commit();
    }

    public void openList(String title, String mode) {
        Intent i = new Intent(this, ListActivity.class);
        i.putExtra("title", title);
        i.putExtra("mode", mode);
        startActivity(i);
    }

    public void openDetail(String slug, int id, String title, String poster, String type, String year) {
        DetailFragment f = DetailFragment.newInstance(slug, id, title, poster, type, year);
        getSupportFragmentManager().beginTransaction()
                .replace(R.id.fragment_container, f)
                .addToBackStack("detail")
                .commit();
    }

    @Override
    public void onBackPressed() {
        if (drawer != null && drawer.isDrawerOpen(GravityCompat.START)) {
            drawer.closeDrawers();
            return;
        }
        if (getSupportFragmentManager().getBackStackEntryCount() > 0) {
            getSupportFragmentManager().popBackStack();
            return;
        }
        super.onBackPressed();
    }
}
