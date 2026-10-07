package com.sunset.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sunset.auth.dto.AddressLookup;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class AddressGeocoderServiceTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void missingKeyNeverContactsProvider() {
        AddressGeocoderService service = new AddressGeocoderService("", mapper);
        assertThat(service.available()).isFalse();
        assertThat(service.lookup(UUID.randomUUID(), new AddressLookup.Request("Нижний Новгород, Покровская 34", false)).suggestions()).isEmpty();
    }

    @Test
    void mapsOnlyCompleteAddressesAndCoordinates() throws Exception {
        var response = mapper.readTree("""
                {"suggestions":[
                  {"value":"г Нижний Новгород, ул Большая Покровская, д 34",
                   "unrestricted_value":"603000, г Нижний Новгород, ул Большая Покровская, д 34",
                   "data":{"city":"Нижний Новгород","street":"Большая Покровская","house":"34","postal_code":"603000","geo_lat":"56.3269","geo_lon":"44.0059"}},
                  {"value":"г Москва","unrestricted_value":"г Москва","data":{"city":"Москва"}}
                ]}
                """);
        var suggestions = AddressGeocoderService.parseCandidates(response);
        assertThat(suggestions).hasSize(1);
        assertThat(suggestions.get(0).city()).isEqualTo("Нижний Новгород");
        assertThat(suggestions.get(0).lat()).isEqualTo(56.3269);
        assertThat(suggestions.get(0).lon()).isEqualTo(44.0059);
    }
}
