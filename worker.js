const ADMIN_VERIFIER = "b4d5b91cdde5078a02b89bf38bcdefab665d8e469c0d163c2a612a97b37f98bb";
const MENU_KEY = "menu-data";

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store, max-age=0",
      ...headers,
    },
  });
}

async function digest(value) {
  const bytes = new TextEncoder().encode(String(value || ""));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function validKey(value) {
  const candidate = await digest(value);
  if (candidate.length !== ADMIN_VERIFIER.length) return false;
  let diff = 0;
  for (let i = 0; i < candidate.length; i += 1) diff |= candidate.charCodeAt(i) ^ ADMIN_VERIFIER.charCodeAt(i);
  return diff === 0;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function text(value, max) {
  return String(value || "").trim().slice(0, max);
}

function normalize(input) {
  const source = input && typeof input === "object" ? input : {};
  const items = {};
  const rawItems = source.items && typeof source.items === "object" ? source.items : {};
  for (const [id, item] of Object.entries(rawItems)) {
    if (!/^[a-z0-9-]{1,80}$/i.test(id) || !item || typeof item !== "object") continue;
    items[id] = {
      price: Math.round(clamp(item.price, 0, 100000000)),
      discount: Math.round(clamp(item.discount, 0, 100)),
      hidden: item.hidden === true,
    };
  }
  const allowed = new Set(["cafe", "ps5", "pc", "cinema", "billiards", "vr"]);
  const offers = Array.isArray(source.offers) ? source.offers.slice(0, 100).map((offer, index) => {
    const current = offer && typeof offer === "object" ? offer : {};
    return {
      id: text(current.id, 100) || `offer-${Date.now()}-${index}`,
      title: text(current.title, 80),
      category: allowed.has(current.category) ? current.category : "cafe",
      price: Math.round(clamp(current.price, 0, 100000000)),
      discount: Math.round(clamp(current.discount, 0, 100)),
      imageUrl: text(current.imageUrl, 500),
      description: text(current.description, 220),
      hidden: current.hidden === true,
    };
  }) : [];
  return { version: 2, updatedAt: new Date().toISOString(), items, offers };
}

export class MenuStore {
  constructor(state) {
    this.state = state;
  }

  async fetch(request) {
    if (request.method === "GET") {
      const data = await this.state.storage.get(MENU_KEY);
      return json(data || { version: 2, updatedAt: null, items: {}, offers: [] });
    }
    if (request.method === "PUT") {
      let payload;
      try { payload = await request.json(); }
      catch { return json({ error: "invalid_json" }, 400); }
      const data = normalize(payload);
      await this.state.storage.put(MENU_KEY, data);
      return json(data);
    }
    if (request.method === "DELETE") {
      await this.state.storage.delete(MENU_KEY);
      return json({ version: 2, updatedAt: null, items: {}, offers: [] });
    }
    return json({ error: "method_not_allowed" }, 405, { allow: "GET, PUT, DELETE" });
  }
}

function store(env) {
  const id = env.MENU_STORE.idFromName("global");
  return env.MENU_STORE.get(id);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/admin/login") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { allow: "POST" });
      let body;
      try { body = await request.json(); }
      catch { return json({ error: "invalid_json" }, 400); }
      return (await validKey(body && body.key)) ? json({ ok: true }) : json({ ok: false }, 401);
    }

    if (url.pathname === "/api/menu") {
      if (request.method === "GET") return store(env).fetch(request);
      if (request.method === "PUT" || request.method === "DELETE") {
        if (!(await validKey(request.headers.get("x-sound-key") || ""))) return json({ error: "unauthorized" }, 401);
        return store(env).fetch(request);
      }
      return json({ error: "method_not_allowed" }, 405, { allow: "GET, PUT, DELETE" });
    }

    const response = await env.ASSETS.fetch(request);
    if (response.status !== 404) return response;
    const fallback = new URL(request.url);
    fallback.pathname = "/index.html";
    return env.ASSETS.fetch(new Request(fallback, request));
  },
};
