package com.sunset.auth.dto;

import java.util.List;

public final class AddressLookup {
    private AddressLookup() {}

    public record Request(String query, boolean selected) {}
    public record Candidate(String value, String query, String city, String street, String house,
                            String building, String postalCode, Double lat, Double lon) {}
    public record Result(boolean available, List<Candidate> suggestions) {}
}
