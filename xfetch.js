/*
xfetch — Drop-in wrapper for native fetch with smart defaults and powerful middleware support
Copyright (C) 2025 Camila Prá

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

import qs from 'https://esm.sh/qs@6.14.0';

let xfetch = async (input, init = {}) => {
  let url = typeof input === 'string' ? input : input.url;
  let headers = new Headers(init.headers || {});
  let method = (init.method || (init.body ? 'POST' : 'GET')).toUpperCase();
  let body = init.body;

  if (body != null) {
    if (body instanceof URLSearchParams) {
      if (!headers.has('Content-Type')) {
        headers.set(
          'Content-Type',
          'application/x-www-form-urlencoded;charset=UTF-8',
        );
      }
    } else if (
      typeof body === 'object' &&
      !(body instanceof Blob) &&
      !(body instanceof FormData)
    ) {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      body = JSON.stringify(body);
    }
  }

  let finalUrl = appendQueryParams(url, init.query);
  let parsedUrl = new URL(finalUrl, 'http://default');
  let protocol =
    extractProtocol(finalUrl) || parsedUrl.protocol.replace(':', '');

  let req = createReqObject({
    input,
    init,
    url: parsedUrl,
    method,
    headers,
    body,
  });

  let res = createResObject();

  await runMiddlewares(req, res);
  return res._sent
    ? res.response
    : fetch(finalUrl, { ...init, method, headers, body });
};

xfetch.middlewares = [];

function appendQueryParams(url, query) {
  if (!query) return url;
  let queryString = qs.stringify(query);
  return url.includes('?') ? `${url}&${queryString}` : `${url}?${queryString}`;
}

function extractProtocol(url) {
  let match = url.match(/^(\w+):\/\//);
  return match?.[1];
}

function createReqObject({ input, init, url, method, headers, body }) {
  let query = JSON.parse(
    JSON.stringify(qs.parse(url.search.slice(1)), (k, v) =>
      /^\d+$/.test(v) ? Number(v) : v,
    ),
  );

  let req = {
    method,
    url: url.pathname + url.search,
    protocol: extractProtocol(url.href) || 'http',
    headers: Object.fromEntries(headers.entries()),
    query,
    body: parseBody(body, headers),
  };

  return req;
}

function parseBody(body, headers) {
  let type = headers.get('Content-Type');
  if (!body || !type) return body;

  if (type.includes('application/json')) {
    try {
      return JSON.parse(body);
    } catch {
      return body;
    }
  } else if (type.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(body));
  }

  return body;
}

function createResObject() {
  let bodyChunks = [];

  return {
    _sent: false,
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(key, value) {
      this.headers[key] = value;
    },
    getHeader(key) {
      return this.headers[key];
    },
    write(chunk) {
      if (typeof chunk === 'string') {
        bodyChunks.push(new TextEncoder().encode(chunk));
      } else if (chunk instanceof Uint8Array) {
        bodyChunks.push(chunk);
      } else if (chunk != null) {
        bodyChunks.push(new TextEncoder().encode(String(chunk)));
      }
    },
    end(chunk) {
      if (chunk) this.write(chunk);
      this._sent = true;
      let blob = new Blob(bodyChunks, {
        type: this.headers['Content-Type'] || 'text/plain',
      });
      this.response = new Response(blob, {
        status: this.statusCode,
        headers: this.headers,
      });
    },
    json(data) {
      this.setHeader('Content-Type', 'application/json');
      this.end(JSON.stringify(data));
    },
    send(data) {
      let isJSON =
        typeof data === 'object' && data !== null && !(data instanceof Blob);
      if (isJSON) {
        this.setHeader('Content-Type', 'application/json');
        this.end(JSON.stringify(data));
      } else {
        this.end(data);
      }
    },
  };
}

async function runMiddlewares(req, res) {
  let index = -1;

  async function next(i = 0) {
    if (i <= index) {
      throw new Error(
        `next() called multiple times in middleware at index ${i - 1}`,
      );
    }

    index = i;
    let middleware = xfetch.middlewares[i];
    if (!middleware) return;

    let called = false;
    await middleware(req, res, () => {
      if (called) {
        throw new Error(
          `next() called multiple times in middleware at index ${i}`,
        );
      }
      called = true;
      return next(i + 1);
    });
  }

  await next();
}

export default xfetch;
