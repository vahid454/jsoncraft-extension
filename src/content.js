// ── Auto-detect JSON/XML pages ─────────────────────────────
// Runs on every page — checks if the page is a raw JSON or XML response

(function () {
  // Only run on pages that look like raw API responses
  const ct = document.contentType || "";
  const isJsonPage = ct.includes("json") || ct.includes("javascript");
  const isXmlPage  = ct.includes("xml");

  // Also check if body contains only JSON/XML (no HTML tags)
  const body = document.body;
  if (!body) return;

  const raw = body.innerText?.trim() || "";
  const looksLikeJSON = !ct.includes("html") && (raw.startsWith("{") || raw.startsWith("["));
  const looksLikeXML  = !ct.includes("html") && raw.startsWith("<") && !raw.startsWith("<!DOCTYPE html");

  if (!isJsonPage && !isXmlPage && !looksLikeJSON && !looksLikeXML) return;

  // Validate it's actually parseable
  let parsed = null;
  let type   = "json";

  if (looksLikeJSON || isJsonPage) {
    try { parsed = JSON.parse(raw); type = "json"; } catch {}
  }
  if (!parsed && (looksLikeXML || isXmlPage)) {
    try {
      const p = new DOMParser();
      const d = p.parseFromString(raw, "text/xml");
      if (!d.querySelector("parsererror")) { parsed = true; type = "xml"; }
    } catch {}
  }

  if (!parsed) return;

  // Inject the JSONcraft viewer
  injectViewer(raw, type);
})();

function injectViewer(raw, type) {
  // Save to storage and notify background
  chrome.storage.local.set({ jsoncraft_page: { data: raw, type } });

  // Replace page with our viewer iframe
  document.open();
  document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>JSONcraft — ${type.toUpperCase()} Viewer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #030712; font-family: 'JetBrains Mono', monospace; }
    iframe { width: 100vw; height: 100vh; border: none; display: block; }
  </style>
</head>
<body>
  <iframe src="${chrome.runtime.getURL("popup.html")}?source=page&type=${type}" id="jc-frame"></iframe>
  <script>
    // Pass raw data to iframe after it loads
    const frame = document.getElementById('jc-frame');
    frame.onload = () => {
      frame.contentWindow.postMessage({ type: 'JSONCRAFT_PAGE_DATA', data: ${JSON.stringify(raw)}, inputType: '${type}' }, '*');
    };
  </script>
</body>
</html>`);
  document.close();
}