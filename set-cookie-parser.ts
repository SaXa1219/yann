// Vite 在开发模式下把 set-cookie-parser 的 CJS 构建当作 ESM 加载时，默认只提供 default 导出。
// react-router 等库使用 named import { splitCookiesString }，会触发 SyntaxError。
// 这个 shim 提供与 set-cookie-parser 兼容的具名导出，绕过 CJS 默认导出问题。

export interface ParseOptions {
  decodeValues?: boolean;
  map?: boolean;
  silent?: boolean;
}

export interface ParsedCookie {
  name: string;
  value: string;
  expires?: Date;
  maxAge?: number;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string;
  partitioned?: boolean;
  [key: string]: string | number | boolean | Date | undefined;
}

const defaultParseOptions: Required<ParseOptions> = {
  decodeValues: true,
  map: false,
  silent: false,
};

function createNullObj() {
  return Object.create(null) as Record<string, ParsedCookie>;
}

function isNonEmptyString(str: unknown): str is string {
  return typeof str === 'string' && !!str.trim();
}

function parseNameValuePair(nameValuePairStr: string): { name: string; value: string } {
  const arr = nameValuePairStr.split('=');
  if (arr.length > 1) {
    return { name: arr.shift()!, value: arr.join('=') };
  }
  return { name: '', value: nameValuePairStr };
}

export function parseString(setCookieValue: string, options?: ParseOptions): ParsedCookie | null {
  const parts = setCookieValue.split(';').filter(isNonEmptyString);
  const nameValue = parseNameValuePair(parts.shift() || '');
  const name = nameValue.name;
  let value = nameValue.value;

  const opts = options ? { ...defaultParseOptions, ...options } : defaultParseOptions;

  if (!name) return null;

  if (opts.decodeValues) {
    try {
      value = decodeURIComponent(value);
    } catch (e) {
      console.error(
        'set-cookie-parser: failed to decode cookie value. Set options.decodeValues=false to disable decoding.',
        e,
      );
    }
  }

  const cookie: ParsedCookie = { name, value };

  parts.forEach(part => {
    const sides = part.split('=');
    const key = (sides.shift() || '').trim().toLowerCase();
    const val = sides.join('=');
    if (!key) return;
    if (key === 'expires') {
      cookie.expires = new Date(val);
    } else if (key === 'max-age') {
      const n = parseInt(val, 10);
      if (!Number.isNaN(n)) cookie.maxAge = n;
    } else if (key === 'secure') {
      cookie.secure = true;
    } else if (key === 'httponly') {
      cookie.httpOnly = true;
    } else if (key === 'samesite') {
      cookie.sameSite = val;
    } else if (key === 'partitioned') {
      cookie.partitioned = true;
    } else {
      cookie[key] = val;
    }
  });

  return cookie;
}

export function parse(
  input: string | string[] | { headers?: { 'set-cookie'?: string | string[]; getSetCookie?: () => string[]; cookie?: string } },
  options?: ParseOptions,
): ParsedCookie[] | Record<string, ParsedCookie> {
  const opts = options ? { ...defaultParseOptions, ...options } : defaultParseOptions;

  let raw: string | string[] | undefined;

  if (input && typeof input === 'object' && !Array.isArray(input) && 'headers' in input) {
    const headers = input.headers;
    if (typeof headers?.getSetCookie === 'function') {
      raw = headers.getSetCookie();
    } else if (headers?.['set-cookie']) {
      raw = headers['set-cookie'];
    } else {
      const key = Object.keys(headers || {}).find(k => k.toLowerCase() === 'set-cookie');
      raw = key ? (headers as Record<string, string | string[]>)[key] : undefined;
      if (!raw && headers?.cookie && !opts.silent) {
        console.warn(
          'Warning: set-cookie-parser appears to have been called on a request object. It is designed to parse Set-Cookie headers from responses, not Cookie headers from requests. Set the option {silent: true} to suppress this warning.',
        );
      }
    }
  } else {
    raw = input as string | string[];
  }

  if (!raw) {
    return opts.map ? createNullObj() : [];
  }

  const arr = Array.isArray(raw) ? raw : [raw];

  if (!opts.map) {
    return arr.filter(isNonEmptyString).map(str => parseString(str, opts)).filter(Boolean) as ParsedCookie[];
  }

  return arr.filter(isNonEmptyString).reduce((cookies, str) => {
    const cookie = parseString(str, opts);
    if (cookie && cookie.name) {
      cookies[cookie.name] = cookie;
    }
    return cookies;
  }, createNullObj());
}

export function splitCookiesString(cookiesString: unknown): string[] {
  if (Array.isArray(cookiesString)) {
    return cookiesString as string[];
  }
  if (typeof cookiesString !== 'string') {
    return [];
  }
  const str = cookiesString;

  const cookiesStrings: string[] = [];
  let pos = 0;
  let start: number;
  let ch: string;
  let lastComma: number;
  let nextStart: number;
  let cookiesSeparatorFound: boolean;

  function skipWhitespace() {
    while (pos < str.length && /\s/.test(str.charAt(pos))) {
      pos += 1;
    }
    return pos < str.length;
  }

  function notSpecialChar() {
    ch = str.charAt(pos);
    return ch !== '=' && ch !== ';' && ch !== ',';
  }

  while (pos < str.length) {
    start = pos;
    cookiesSeparatorFound = false;

    while (skipWhitespace()) {
      ch = str.charAt(pos);
      if (ch === ',') {
        lastComma = pos;
        pos += 1;

        skipWhitespace();
        nextStart = pos;

        while (pos < str.length && notSpecialChar()) {
          pos += 1;
        }

        if (pos < str.length && str.charAt(pos) === '=') {
          cookiesSeparatorFound = true;
          pos = nextStart;
          cookiesStrings.push(str.substring(start, lastComma));
          start = pos;
        } else {
          pos = lastComma + 1;
        }
      } else {
        pos += 1;
      }
    }

    if (!cookiesSeparatorFound || pos >= str.length) {
      cookiesStrings.push(str.substring(start, str.length));
    }
  }

  return cookiesStrings;
}

export default parse;
