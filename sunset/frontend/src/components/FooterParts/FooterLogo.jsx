import React from "react";
import BrandLogo from "../BrandLogo";
import "./FooterLogo.css";

export default function FooterLogo() {
  return (
    <div className="footer__logo">
      <BrandLogo tone="light" />
      <p>Одежда, в которой остаётся ваше настроение.</p>
    </div>
  );
}
