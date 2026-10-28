import React from "react";
import "./BrandLogo.css";

export default function BrandLogo({ tone = "dark", compact = false }) {
  return (
    <span className={`brand-logo brand-logo--${tone} ${compact ? "brand-logo--compact" : ""}`} aria-label="SUNSET">
      <svg className="brand-logo__mark" viewBox="0 0 52 52" role="img" aria-hidden="true">
        <circle cx="26" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 25.5h36M12 31.5h28M17 37.5h18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
      <span className="brand-logo__word">SUNSET</span>
    </span>
  );
}
