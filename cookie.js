// Vite 在开发模式下把 cookie 的 CJS 构建当作 ESM 加载时，默认只提供 default 导出。
// react-router 等库使用 named import { parse, serialize }，会触发 SyntaxError。
// 这个 shim 提供与 cookie 兼容的 parse / serialize 具名导出，绕过 CJS 默认导出问题。

function defaultDecode(str) {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

function defaultEncode(str) {
  return encodeURIComponent(str);
}

export function parse(str, options) {
  const obj = {};
  if (!str) return obj;
  const decode = (options && options.decode) || defaultDecode;
  const pairs = str.split(';');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx === -1) continue;
    const key = pair.slice(0, eqIdx).trim();
    let value = pair.slice(eqIdx + 1).trim();
    if (value.length >= 2 && value[0] === '"' && value[value.length - 1] === '"') {
      value = value.slice(1, -1);
    }
    if (obj[key] === undefined) {
      const decoded = decode(value);
      obj[key] = decoded === undefined ? value : decoded;
    }
  }
  return obj;
}

export function serialize(name, val, options) {
  const encode = (options && options.encode) || defaultEncode;
  let str = `${name}=${encode(val)}`;
  if (options) {
    if (options.maxAge !== undefined) str += `; Max-Age=${options.maxAge}`;
    if (options.domain) str += `; Domain=${options.domain}`;
    if (options.path) str += `; Path=${options.path}`;
    if (options.expires) str += `; Expires=${options.expires.toUTCString()}`;
    if (options.httpOnly) str += '; HttpOnly';
    if (options.secure) str += '; Secure';
    if (options.sameSite) str += `; SameSite=${options.sameSite === true ? 'strict' : options.sameSite}`;
  }
  return str;
}

export default { parse, serialize };
