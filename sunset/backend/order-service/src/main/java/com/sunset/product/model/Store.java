package com.sunset.product.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.UUID;

@Entity
@Table(name = "stores")
public class Store {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private String city;
    @Column(nullable = false) private String address;
    private String phone;
    private String hours;
    private BigDecimal latitude;
    private BigDecimal longitude;
    private boolean active = true;
    public UUID getId() { return id; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getCity() { return city; }
    public void setCity(String value) { city = value; }
    public String getAddress() { return address; }
    public void setAddress(String value) { address = value; }
    public String getPhone() { return phone; }
    public void setPhone(String value) { phone = value; }
    public String getHours() { return hours; }
    public void setHours(String value) { hours = value; }
    public BigDecimal getLatitude() { return latitude; }
    public void setLatitude(BigDecimal value) { latitude = value; }
    public BigDecimal getLongitude() { return longitude; }
    public void setLongitude(BigDecimal value) { longitude = value; }
    public boolean isActive() { return active; }
    public void setActive(boolean value) { active = value; }
}
