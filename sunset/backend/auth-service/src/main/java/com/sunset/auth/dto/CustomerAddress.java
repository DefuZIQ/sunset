package com.sunset.auth.dto;

import java.util.UUID;

public record CustomerAddress(
        UUID id, String label, String city, String street, String house,
        String building, String structure, String entrance, String floor,
        String apartment, String intercom, String postalCode, String comment,
        Double lat, Double lon) {}
