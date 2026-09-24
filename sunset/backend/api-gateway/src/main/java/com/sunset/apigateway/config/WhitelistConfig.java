package com.sunset.apigateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "security")
public class WhitelistConfig {

    private List<String> whitelistPaths = new ArrayList<>();

    public List<String> getWhitelistPaths() {
        return whitelistPaths;
    }

    public void setWhitelistPaths(List<String> whitelistPaths) {
        this.whitelistPaths = whitelistPaths;
    }
}
