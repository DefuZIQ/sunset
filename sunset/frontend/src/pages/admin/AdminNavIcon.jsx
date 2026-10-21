const paths = {
  overview: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  orders: <><path d="M7 3h10l3 4v14H4V7l3-4Z"/><path d="M4 8h16M9 13h6M9 17h6"/></>,
  returns: <><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 1 1 0 12h-3"/></>,
  products: <><path d="M4 7h16v14H4zM8 7V5a4 4 0 0 1 8 0v2M4 12h16"/></>,
  stock: <><path d="m3 7 9-4 9 4-9 4-9-4ZM3 7v10l9 4 9-4V7M12 11v10"/></>,
  reviews: <><path d="M4 4h16v13H9l-5 4V4Z"/><path d="m12 7 .9 2 2.1.2-1.6 1.4.5 2.1-1.9-1.1-1.9 1.1.5-2.1L9 9.2l2.1-.2.9-2Z"/></>,
  promos: <><path d="M3 10V4h6l12 12-5 5L3 8"/><circle cx="7" cy="7" r="1"/><path d="m12 16 4-4"/></>,
  users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3ZM16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5v1h-3"/></>,
  access: <><path d="M12 2 4 5v6c0 5 3.2 8.5 8 11 4.8-2.5 8-6 8-11V5l-8-3Z"/><path d="m9 12 2 2 4-4"/></>,
  security: <><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>,
};

export default function AdminNavIcon({ name }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
