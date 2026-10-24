package com.sunset.contract;

import java.util.UUID;

public interface CustomerProfileReader {
    CustomerProfile get(UUID id);
}
