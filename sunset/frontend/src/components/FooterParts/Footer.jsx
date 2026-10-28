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
                { to: "/newproducts", text: "Новая коллекция" },
                { to: "/promotions", text: "Акции" },
              ]}
            />

            <FooterBlock
              title="Каталог"
              links={[
                { to: "/catalog", text: "Все товары" },
                { to: "/catalog?gender=WOMEN", text: "Женщинам" },
                { to: "/catalog?gender=MEN", text: "Мужчинам" },
                { to: "/catalog?category%5B%5D=%D0%96%D0%B5%D0%BD%D1%81%D0%BA%D0%B8%D0%B5+%D0%BF%D0%BB%D0%B0%D1%82%D1%8C%D1%8F", text: "Платья" },
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
          <div className="footer__bottom"><span>© {new Date().getFullYear()} SUNSET</span><span>Создано для вашего стиля</span></div>
        </div>
      </section>
    </footer>
  );
}
