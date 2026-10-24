package com.sunset.contract;

import java.util.List;
import java.util.UUID;

public record IamIdentity(String role, String staffRole, UUID locationId, List<String> permissions) {}
