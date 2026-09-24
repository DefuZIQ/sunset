import React, { useState } from "react";
import "./SubscribeSection.css";

export default function SubscribeSection() {
  const [email,setEmail]=useState(""); const [message,setMessage]=useState(""); const [loading,setLoading]=useState(false);
  const subscribe=async(event)=>{event.preventDefault();setLoading(true);setMessage("");const token=localStorage.getItem("authToken");try{const response=await fetch("/subscriptions",{method:"POST",headers:{"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})},body:JSON.stringify({email})});const data=await response.json();if(!response.ok)throw new Error(data.message||"Не удалось подписаться");setMessage("Готово! Скидка и новости уже ваши.");setEmail("");}catch(error){setMessage(error.message);}finally{setLoading(false);}};
  return (
    <section className="subscribe">
      <div className="container subscribe__container">
        <div className="subscribe__content">
          <div className="subscribe__text">
            <p className="subscribe__title">Скидка 10% за подписку</p>
            <p className="subscribe__subtitle">
              Узнавай первым о новинках и скидках
            </p>
          </div>

          <div className="subscribe__form-wrap">
            <form
              id="subscribe-form"
              className="subscribe__form-styled"
              onSubmit={subscribe}
            >
              <input
                type="email"
                name="email"
                placeholder="Ваш e-mail"
                required
                value={email}
                onChange={(event)=>setEmail(event.target.value)}
              />
              <button type="submit" disabled={loading}>{loading?"Отправляем…":"Подписаться"}</button>
            </form>
            <div className="subscribe__message" aria-live="polite">{message}</div>
          </div>

          <div className="subscribe__social">
            {/* Instagram */}
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg width="60" height="73" viewBox="0 0 60 73" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="32.5" cy="37" r="27.5" fill="#FFFDFB" />
                <path d="M26.286 47.9875L26.7521 40.9953L39.5353 29.5566C40.1012 29.0442 39.4188 28.7962 38.6698 29.2425L22.8905 39.144L16.0661 36.9951C14.6013 36.5818 14.5847 35.5735 16.399 34.8462L42.9808 24.6637C44.1959 24.1182 45.361 24.9613 44.895 26.8126L40.3676 47.9875C40.0513 49.4918 39.1358 49.8554 37.8708 49.1612L30.9799 44.103L27.6675 47.2933C27.2847 47.6735 26.9684 47.9875 26.286 47.9875Z" fill="#222222" />
              </svg>
            </a>

            {/* Telegram */}
            <a href="https://t.me" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
              <svg width="72" height="67" viewBox="0 0 72 67" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="36.5" cy="34" r="27.5" fill="#FFFDFB" />
                <g clipPath="url(#clip0_138_15)">
                  <path d="M53.9839 34.9945C53.9839 37.3078 53.9373 39.6278 53.9972 41.9411C54.097 46.036 51.5229 49.2002 48.2438 50.6095C46.9268 51.1745 45.5434 51.4737 44.1133 51.4737C39.637 51.4803 35.154 51.5401 30.6777 51.4537C27.3055 51.3872 24.5319 49.978 22.5431 47.1993C21.4988 45.7369 21 44.075 21 42.2735C21 37.5072 21 32.7476 21 27.9814C21 24.0926 22.8956 21.3738 26.2612 19.6055C27.7245 18.8411 29.3141 18.5153 30.9703 18.5087C35.3136 18.5087 39.6636 18.4821 44.0069 18.522C47.3791 18.5486 50.1926 19.8382 52.2679 22.5504C53.4252 24.066 53.9839 25.8076 53.9839 27.7221C53.9839 30.1418 53.9839 32.5682 53.9839 34.9945ZM23.4543 34.9945C23.4543 37.4341 23.4543 39.8671 23.4543 42.3067C23.4543 43.3969 23.7071 44.4207 24.2724 45.3447C25.7557 47.771 27.9972 48.9543 30.7774 49.0008C35.2405 49.0673 39.7102 49.0274 44.1798 49.0141C45.2773 49.0141 46.3415 48.7881 47.3326 48.3161C50.033 47.0265 51.5429 44.9724 51.5296 41.888C51.5029 37.1682 51.5229 32.4485 51.5229 27.7288C51.5229 26.3926 51.1438 25.1695 50.3523 24.0926C48.8225 22.0252 46.7073 21.0081 44.1798 20.9816C39.7235 20.9284 35.2671 20.9616 30.8107 20.9683C29.8596 20.9683 28.9417 21.161 28.0504 21.4934C25.6027 22.4041 23.328 24.7108 23.4344 28.1077C23.5142 30.4077 23.4543 32.7011 23.4543 34.9945Z" fill="#222222" />
                  <path d="M37.5064 41.5C33.3541 41.5 30.0064 38.1478 30 33.9739C29.9936 29.8652 33.367 26.5 37.4936 26.5C41.633 26.4935 44.9936 29.8522 45 33.9935C45 38.1283 41.6459 41.4935 37.5064 41.5ZM37.5064 39.087C40.3326 39.087 42.6245 36.7978 42.618 33.9804C42.6116 31.1891 40.3197 28.9065 37.5064 28.9065C34.6803 28.9065 32.3755 31.1826 32.3755 33.9935C32.382 36.8109 34.6803 39.0935 37.5064 39.087Z" fill="#222222" />
                  <path d="M46.497 24.5C47.3252 24.5 48 25.1765 48 26.0059C47.9939 26.8353 47.3129 27.5058 46.4847 27.5C45.6687 27.4941 45 26.8235 45 26.0117C44.9939 25.1823 45.6687 24.5 46.497 24.5Z" fill="#222222" />
                </g>
                <defs>
                  <clipPath id="clip0_138_15">
                    <rect width="34" height="34" fill="white" transform="translate(20 17.5)" />
                  </clipPath>
                </defs>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
