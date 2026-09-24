import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../contexts/StoreContext";
import "./AssistantWidget.css";

export default function AssistantWidget() {
  const { products } = useStore();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [messages, setMessages] = useState([{ role: "assistant", text: "Привет! Я помогу подобрать вещь по стилю, размеру, цвету и бюджету." }]);
  const recognition = useRef(null);
  const send = async (text = message) => {
    if (!text.trim() || loading) return;
    setMessages((m) => [...m, { role: "user", text }]); setMessage(""); setLoading(true);
    try {
      const words = text.toLowerCase().split(/[^a-zа-яё0-9]+/i).filter(word => word.length > 2);
      const candidates = products.map((product, index) => {
        const searchable = [product.name, product.gender, ...(product.categories || []), ...(product.colors || []).map(color => color.name)].join(" ").toLowerCase();
        return { product, index, score: words.reduce((sum, word) => sum + (searchable.includes(word) ? 1 : 0), 0) };
      }).sort((a, b) => b.score - a.score || a.index - b.index).slice(0, 35).map(item => item.product);
      const catalog = candidates.map(p => ({ id: p.id, name: p.name, price: p.price, gender: p.gender, categories: p.categories, colors: p.colors?.map(c => c.name), sizes: [...new Set(p.stock?.map(s => s.sizeName))] }));
      const r = await fetch("/assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text, products: catalog }) });
      const data = await r.json();
      const ids = new Set((data.productIds || []).map(String));
      setMessages((m) => [...m, { role: "assistant", text: data.message || "Подскажите, что вам хотелось бы найти?", products: products.filter(p => ids.has(String(p.id))).slice(0, 4) }]);
      if (data.message && window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(data.message));
    } catch { setMessages((m) => [...m, { role: "assistant", text: "Не удалось связаться с помощником. Попробуйте ещё раз." }]); }
    finally { setLoading(false); }
  };
  const toggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert("Голосовой ввод не поддерживается этим браузером");
    if (listening) { recognition.current?.stop(); return; }
    const r = new SpeechRecognition(); r.lang = "ru-RU"; r.interimResults = false;
    r.onstart = () => setListening(true); r.onend = () => setListening(false);
    r.onresult = e => { const text = e.results[0][0].transcript; setMessage(text); send(text); };
    recognition.current = r; r.start();
  };
  useEffect(() => () => recognition.current?.stop(), []);
  return <div className="assistant-widget">{!open && <button className="assistant-launcher" onClick={() => setOpen(true)} aria-label="Открыть помощника"><span className="assistant-spark">✦</span><span className="assistant-launcher-label">Подобрать образ</span></button>}
    {open && <section className="assistant-panel"><header><div className="assistant-brand"><span className="assistant-brand-mark">✦</span><div><b>Помощник SUNSET</b><small><i/>Онлайн · подберу ваш образ</small></div></div><button className="assistant-close" onClick={() => setOpen(false)} aria-label="Закрыть помощника">×</button></header>
      <div className="assistant-messages">{messages.map((m, i) => <div className={`assistant-message ${m.role}`} key={i}>{m.text}{m.products?.length > 0 && <div className="assistant-products">{m.products.map(p => <Link to={`/catalog/product/${p.id}`} key={p.id}><img src={p.imageUrl} alt=""/><span>{p.name}<strong>{p.price} ₽</strong></span></Link>)}</div>}</div>)}{loading && <div className="assistant-message">Подбираю варианты…</div>}</div>
      <form onSubmit={e => {e.preventDefault(); send();}}><input value={message} onChange={e => setMessage(e.target.value)} placeholder="Например: платье на вечер"/><button aria-label="Голосовой ввод" type="button" className={`assistant-voice ${listening ? "recording" : ""}`} onClick={toggleVoice}>●</button><button aria-label="Отправить" className="assistant-send" type="submit">↑</button></form>
    </section>}
  </div>;
}
