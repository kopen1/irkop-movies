package com.nontongo.app.net;

import com.nontongo.app.model.DetailData;
import com.nontongo.app.model.EpisodesResponse;
import com.nontongo.app.model.Page;
import com.nontongo.app.model.PlayResponse;
import com.nontongo.app.model.SuggestResponse;

import retrofit2.Call;
import retrofit2.http.GET;
import retrofit2.http.Path;
import retrofit2.http.Query;

public interface Api {
    @GET("api/catalog/trending")
    Call<Page> trending();

    @GET("api/catalog/popular")
    Call<Page> popular(@Query("page") int page);

    @GET("api/catalog/top")
    Call<Page> top();

    @GET("api/catalog/genre")
    Call<Page> genre(@Query("g") String genre, @Query("page") int page);

    @GET("api/catalog/list")
    Call<Page> list(@Query("t") String type, @Query("page") int page);

    @GET("api/catalog/year")
    Call<Page> year(@Query("y") String year, @Query("page") int page);

    @GET("api/catalog/country")
    Call<Page> country(@Query("c") String country, @Query("page") int page);

    @GET("api/catalog/search")
    Call<Page> search(@Query("q") String q, @Query("page") int page,
                      @Query("type") String type, @Query("year") String year);

    @GET("api/catalog/suggest")
    Call<SuggestResponse> suggest(@Query("q") String q);

    @GET("api/catalog/detail/{slug}")
    Call<DetailData> detail(@Path("slug") String slug, @Query("id") Integer id);

    @GET("api/catalog/episodes")
    Call<EpisodesResponse> episodes(@Query("slug") String slug);

    @GET("api/catalog/related")
    Call<Page> related(@Query("ids") String ids, @Query("type") String type);

    @GET("api/stream/play")
    Call<PlayResponse> play(@Query("slug") String slug, @Query("s") Integer server);
}
