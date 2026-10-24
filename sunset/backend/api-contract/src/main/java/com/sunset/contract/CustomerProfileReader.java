package com.sunset.contract;

import java.util.UUID;
import java.util.List;

public interface CustomerProfileReader {
    CustomerProfile get(UUID id);

    List<CustomerDirectoryEntry> list(int offset, int limit);
}
