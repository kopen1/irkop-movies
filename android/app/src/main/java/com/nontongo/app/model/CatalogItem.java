package com.nontongo.app.model;

import java.io.Serializable;

public class CatalogItem implements Serializable {
    public String id;
    public String slug;
    public String title;
    public String year;
    public String type;
    public String poster;
    public String quality;
    public String runtime;
    public Double rating;
    public Integer post_id;
    public int progress;
}
