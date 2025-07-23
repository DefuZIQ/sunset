import React from "react";
import { Link } from "react-router-dom";
import "./FooterBlock.css";

export default function FooterBlock({ title, links, paragraphs }) {
  return (
    <div className="footer__block">
      <h3>{title}</h3>
      {links && links.map(({ to, text }, i) => (
        <Link key={i} to={to}>{text}</Link>
      ))}
      {paragraphs && paragraphs.map((text, i) => (
        <p key={i}>{text}</p>
      ))}
    </div>
  );
}
