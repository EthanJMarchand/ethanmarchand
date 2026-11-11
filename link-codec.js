/* One packing for ?case=, ?plan=, ?iq=, and ?in=: deflate, then base64url.
   Anyone with the link can still open it. The address bar is not a list of answers. */
(function (root, factory) {
  root.MarchandLink = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function bytesToB64url(bytes) {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function b64urlToBytes(value) {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function toParams(data) {
    const params = new URLSearchParams();
    if (!data || typeof data !== "object") return params;
    Object.entries(data).forEach(([key, value]) => {
      if (value == null || typeof value === "object") return;
      params.set(key, String(value));
    });
    return params;
  }

  async function pack(data) {
    const bytes = new TextEncoder().encode(JSON.stringify(data));
    if (typeof CompressionStream === "function") {
      const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream("deflate-raw"));
      const packed = new Uint8Array(await new Response(stream).arrayBuffer());
      return `z${bytesToB64url(packed)}`;
    }
    return `j${bytesToB64url(bytes)}`;
  }

  async function unpack(payload) {
    const kind = String(payload || "").slice(0, 1);
    const bytes = b64urlToBytes(String(payload || "").slice(1));
    let jsonBytes = bytes;
    if (kind === "z") {
      if (typeof DecompressionStream !== "function") throw new Error("This browser cannot open compressed links");
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
      jsonBytes = new Uint8Array(await new Response(stream).arrayBuffer());
    }
    const parsed = JSON.parse(new TextDecoder().decode(jsonBytes));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Bad link");
    return parsed;
  }

  return { pack, unpack, toParams };
});
