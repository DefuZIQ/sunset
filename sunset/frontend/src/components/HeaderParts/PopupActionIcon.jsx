import React from "react";
import "./PopupActionIcon.css";

const paths = {
  profile: <><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20v-1.2a6.5 6.5 0 0 1 13 0V20" /></>,
  orders: <><path d="M4 7h16l-1 13H5L4 7Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
  notifications: <><path d="M18 8a6 6 0 0 0-12 0c0 7-2 8-2 9h16c0-1-2-2-2-9Z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
  password: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /><circle cx="12" cy="15.5" r="1" /></>,
  admin: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" /><circle cx="8" cy="18" r="2" fill="currentColor" stroke="none" /></>,
  logout: <><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M13 8l4 4-4 4M9 12h8" /></>,
  login: <><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="m11 8 4 4-4 4M4 12h11" /></>,
  register: <><circle cx="8" cy="8" r="3" /><path d="M2.5 20v-1a5.5 5.5 0 0 1 11 0v1M18 8v6m-3-3h6" /></>,
  catalog: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
  basket: <><path d="M4 7h16l-1 13H5L4 7Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
};

export default function PopupActionIcon({ name }) {
  return (
    <span className="popup-action-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {paths[name]}
      </svg>
    </span>
  );
}
