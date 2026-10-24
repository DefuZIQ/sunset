package com.sunset.contract;

import java.util.List;
import java.util.UUID;

/** Authorization boundary implemented locally during migration and by Auth afterward. */
public interface IamAuthorizer {
    boolean isAdmin(UUID userId);
    List<String> permissions(UUID userId);
    String staffRole(UUID userId);
    UUID scopedLocation(UUID userId);
    void require(UUID userId, String permission);
    void requireAdmin(UUID userId);
    void requireLocation(UUID userId, String permission, UUID locationId);
}
