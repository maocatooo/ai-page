// Cloudflare Worker：边缘代理 + 静态资源兜底。
//
// - 静态页面由 Workers Assets 托管（public/ 目录，见 wrangler.jsonc）
// - /proxy?target=<URL编码后的完整请求地址> 负责转发请求并补上 CORS 头，
//   响应体直接流式透传（Workers 原生流式，SSE 打字机效果不受影响）
//
// 请求头白名单：只透传 Authorization / Content-Type / Accept，
// 避免浏览器附带的 Origin / Referer / sec-* 等头污染目标 API。

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const ALLOWED_REQ_HEADERS = new Set(["authorization", "content-type", "accept"]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/proxy" || url.pathname.startsWith("/proxy/")) {
      return handleProxy(request, url);
    }
    // 其余路径交给静态资源（public/index.html 等）
    return env.ASSETS.fetch(request);
  },
};

async function handleProxy(request, url) {
  // 处理预检请求
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  // searchParams.get 已自动完成 URL 解码，得到真实地址
  const target = url.searchParams.get("target");
  if (!target) {
    return textError(
      400,
      'missing "target" query param. Example: /proxy?target=https%3A%2F%2Fapi.openai.com%2Fv1%2Fchat%2Fcompletions'
    );
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch {
    return textError(400, "invalid encoded target: " + target);
  }
  if (targetUrl.protocol !== "http:" && targetUrl.protocol !== "https:") {
    return textError(400, "target must be http(s) url");
  }

  // 请求头白名单：只转发真正需要的头
  const headers = new Headers();
  for (const [k, v] of request.headers) {
    if (ALLOWED_REQ_HEADERS.has(k.toLowerCase())) headers.set(k, v);
  }

  const init = { method: request.method, headers, redirect: "follow" };
  // GET/HEAD 不能带 body，其余方法把请求体流式透传
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  let resp;
  try {
    resp = await fetch(targetUrl, init);
  } catch (err) {
    return textError(502, "请求目标失败: " + (err && err.message ? err.message : String(err)));
  }

  // 复制响应头 + CORS 头；content-encoding/length 在流式透传时可能失真，删掉让运行时重新计算
  const respHeaders = new Headers(resp.headers);
  respHeaders.delete("content-encoding");
  respHeaders.delete("content-length");
  respHeaders.delete("transfer-encoding");
  for (const [k, v] of Object.entries(CORS_HEADERS)) respHeaders.set(k, v);

  // resp.body 是流，直接透传保证 SSE 实时输出
  return new Response(resp.body, { status: resp.status, headers: respHeaders });
}

function textError(status, msg) {
  return new Response(msg + "\n", {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS_HEADERS },
  });
}
