package com.nontongo.app.model;

import java.util.List;

public class PlayResponse {
    public String fileUrl;
    public String proxy;
    public String fallbackUrl;
    public String reason;
    public List<ServerItem> servers;
    public Integer current;
}
