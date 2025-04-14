# ⚡ xfetch

**xfetch** is a drop-in wrapper for native `fetch` with smart defaults and powerful middleware support. It offers a modern, ergonomic API that improves day-to-day fetch usage and supports full control over request/response flow.

It can also serve as a lightweight alternative to libraries like Axios when you need Express-like middleware-style interceptors without the extra overhead.

---

## ✨ Features

- **Smart Defaults**
  - Defaults to `POST` when a body is provided and no method is specified.
  - Automatically sets `Content-Type: application/json` when `body` is an object or array.
  - Built-in support for query parameters via `init.query` (objects are serialized and appended to the URL using `query-string`).

- **Middleware System**
  - Express-style interceptor middlewares for request/response lifecycle control.
  - Easily inject headers, log requests, or short-circuit with mock responses.
  - Middleware logic can run isomorphically in browser and Node/Express.

---

## 🚀 Quick Start

```js
import xfetch from 'https://esm.sh/@camilaprav/xfetch';

// Register middleware before making requests
xfetch.middlewares.push(async (req, res, next) => {
  req.headers['Authorization'] = 'Bearer my-token';
  await next();
});

const res = await xfetch('/api/user', {
  query: { id: 123 },
  body: { name: 'Alice' },
});

const data = await res.json();
```

---

## 🧩 Middleware API

Middlewares receive three arguments: `req`, `res`, and `next`.
They can modify the request, send a response early, or allow the request to proceed.

```js
xfetch.middlewares.push((req, res, next) => {
  if (req.url.startsWith('/dev')) return res.json({ mocked: true });
  next();
});
```

`req` includes:
- `method`, `url`, `protocol`, `headers`, `query`, `body`, `raw`

`res` includes:
- `status()`, `setHeader()`, `getHeader()`, `json()`, `send()`, `write()`, `end()`

---

## 🧠 When to Use

- You want better defaults than native `fetch`.
- You want a lightweight alternative to Axios-style interceptors.
- You want to simulate or mock APIs during local development.
- You want to share middleware logic between client and server (with Express).

---

## 📜 License

GNU General Public License v3.0 or later (GPLv3+)

You are free to use, modify, and redistribute this software under the terms of the GPLv3+.
