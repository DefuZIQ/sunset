import React from "react";

import SubscribeSection from "./SubscribeSection";
import FooterBlock from "./FooterBlock";
import FooterLogo from "./FooterLogo";

import "./Footer.css";

export default function Footer() {
  return (
    <footer>
      <SubscribeSection />

      <section className="footer">
        <div className="container footer__container">
          <div className="footer__grid">
            <FooterLogo />

            <FooterBlock
              title="Магазин"
              links={[
                { to: "/about", text: "О нас" },
                { to: "/new", text: "Новая коллекция" },
                { to: "#subscribe-form", text: "Рассылка" },
              ]}
            />

            <FooterBlock
              title="Каталог"
              links={[
                { to: "/catalog/summer", text: "Летняя коллекция" },
                { to: "/catalog/dresses", text: "Платья" },
                { to: "/delivery", text: "Доставка" },
                { to: "/contacts", text: "Контакты" },
              ]}
            />

            <FooterBlock
              title="Контакты"
              paragraphs={[
                "+7(920)022-01-22",
                "Ежедневно с 9:00 до 21:00",
                "г.Нижний Новгород, ул.Большая Покровская, д.34",
              ]}
            />
          </div>
        </div>
      </section>
    </footer>
  );
}
