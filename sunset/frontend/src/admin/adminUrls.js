const STOREFRONT_HOSTS = new Set(["t3ch.pro", "www.t3ch.pro"]);

export function adminUrl(hostname = window.location.hostname) {
  return STOREFRONT_HOSTS.has(hostname) ? "https://admin.t3ch.pro/" : "/admin/";
}

export function storefrontUrl(hostname = window.location.hostname) {
  return hostname === "admin.t3ch.pro" ? "https://t3ch.pro/" : "/";
}
