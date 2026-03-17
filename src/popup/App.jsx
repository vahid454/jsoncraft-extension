import { useState, useCallback, useEffect } from "react";
import TreeView from "./components/TreeView";
import SearchPanel from "./components/SearchPanel";
import ConvertPanel from "./components/ConvertPanel";
import TypesPanel from "./components/TypesPanel";

const TABS = ["tree", "search", "convert", "types", "raw"];

// ── XML parser ─────────────────────────────────────────────
function parseXML(str) {
  const doc = new DOMParser().parseFromString(str, "text/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error("Invalid XML");
  function nodeToObj(node) {
    if (node.nodeType === 3) return node.nodeValue.trim();
    const obj = {};
    for (const attr of node.attributes || []) obj[`@${attr.name}`] = attr.value;
    for (const child of node.childNodes) {
      if (child.nodeType === 3 && !child.nodeValue.trim()) continue;
      const val = nodeToObj(child);
      if (obj[child.nodeName] !== undefined) {
        if (!Array.isArray(obj[child.nodeName])) obj[child.nodeName] = [obj[child.nodeName]];
        obj[child.nodeName].push(val);
      } else obj[child.nodeName] = val;
    }
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === "#text") return obj["#text"];
    return obj;
  }
  return nodeToObj(doc.documentElement);
}

function detectType(val) {
  const t = val.trimStart();
  if (t.startsWith("<")) return "xml";
  return "json";
}

// Check URL params — are we opened from a page or context menu?
const urlParams  = new URLSearchParams(window.location.search);
const fromPage   = urlParams.get("source") === "page";

export default function App() {
  const [input, setInput]         = useState("");
  const [parsed, setParsed]       = useState(null);
  const [error, setError]         = useState(null);
  const [inputType, setInputType] = useState("json");
  const [dark, setDark]           = useState(true);
  const [activeTab, setActiveTab] = useState("tree");
  const [copyLabel, setCopyLabel] = useState("Copy");
  const [source, setSource]       = useState(null); // "page" | "inject" | null

  // ── Load injected data on mount ───────────────────────────
  useEffect(() => {
    // Listen for page data via postMessage (from content script iframe)
    window.addEventListener("message", (e) => {
      if (e.data?.type === "JSONCRAFT_PAGE_DATA") {
        tryParse(e.data.data);
        setSource("page");
      }
    });

    // Check storage for right-click injected text
    chrome.storage.local.get(["jsoncraft_inject", "jsoncraft_page"], (res) => {
      if (res.jsoncraft_inject) {
        tryParse(res.jsoncraft_inject);
        setSource("inject");
        chrome.storage.local.remove("jsoncraft_inject");
      } else if (res.jsoncraft_page && fromPage) {
        tryParse(res.jsoncraft_page.data);
        setSource("page");
      }
    });
  }, []);

  const tryParse = useCallback((val) => {
    setInput(val);
    if (!val.trim()) { setParsed(null); setError(null); return; }
    const type = detectType(val);
    setInputType(type);
    try {
      setParsed(type === "xml" ? parseXML(val) : JSON.parse(val));
      setError(null);
    } catch (e) {
      setParsed(null);
      setError(e.message);
    }
  }, []);

  const format = () => { if (parsed && inputType === "json") setInput(JSON.stringify(parsed, null, 2)); };
  const minify = () => { if (parsed && inputType === "json") setInput(JSON.stringify(parsed)); };
  const clear  = () => { setInput(""); setParsed(null); setError(null); setInputType("json"); setSource(null); };
  const copy   = () => {
    navigator.clipboard.writeText(input).then(() => {
      setCopyLabel("✓"); setTimeout(() => setCopyLabel("Copy"), 1500);
    });
  };

  const openFull = () => window.open("https://jsoncraft-red.vercel.app", "_blank");

  // Theme
  const T = {
    bg:     dark ? "#030712" : "#f8fafc",
    bg2:    dark ? "#0f172a" : "#ffffff",
    bg3:    dark ? "#111827" : "#f1f5f9",
    border: dark ? "#1f2937" : "#e2e8f0",
    text:   dark ? "#f3f4f6" : "#0f172a",
    mute:   dark ? "#4b5563" : "#94a3b8",
    mute2:  dark ? "#374151" : "#cbd5e1",
  };

  const col = { display:"flex", flexDirection:"column", minHeight:0, minWidth:0, overflow:"hidden" };

  const tbtn = (active) => ({
    fontSize: 11, padding: "4px 10px", borderRadius: 5, cursor: "pointer",
    fontFamily: "inherit", border: `1px solid ${active ? "#10b981" : T.border}`,
    background: active ? "#10b981" : "transparent",
    color: active ? "#030712" : T.mute,
    transition: "all 0.12s",
  });

  return (
    <div style={{ width: "100%", height: "100vh", display:"flex", flexDirection:"column",
      overflow:"hidden", fontFamily:"'JetBrains Mono','Fira Code',monospace",
      background: T.bg, color: T.text }}>

      {/* ── Header ── */}
      <header style={{ flexShrink:0, height:40, borderBottom:`1px solid ${T.border}`,
        padding:"0 12px", display:"flex", alignItems:"center",
        justifyContent:"space-between", background: T.bg }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:22, height:22, borderRadius:4, background:"#10b981",
            display:"flex", alignItems:"center", justifyContent:"center",
            color:"#030712", fontWeight:700, fontSize:11, userSelect:"none" }}>J</div>
          <span style={{ color: T.text, fontWeight:600, fontSize:13 }}>JSONcraft</span>
          {source === "page" && (
            <span style={{ fontSize:10, color:"#10b981", background: dark?"#022c22":"#f0fdf4",
              padding:"2px 6px", borderRadius:10, border:"1px solid #10b981" }}>Auto-detected</span>
          )}
          {source === "inject" && (
            <span style={{ fontSize:10, color:"#f59e0b", background: dark?"#451a03":"#fffbeb",
              padding:"2px 6px", borderRadius:10, border:"1px solid #92400e" }}>From selection</span>
          )}
        </div>
        <div style={{ display:"flex", gap:5, alignItems:"center" }}>
          <button onClick={() => setDark(!dark)} style={tbtn(false)}>{dark?"☀":"☾"}</button>
          <button onClick={openFull} title="Open full site" style={tbtn(false)}>↗ Full</button>
        </div>
      </header>

      {/* ── Toolbar ── */}
      <div style={{ flexShrink:0, padding:"5px 12px", borderBottom:`1px solid ${T.border}`,
        background: T.bg, display:"flex", gap:6, alignItems:"center" }}>
        <button onClick={format} disabled={!parsed || inputType==="xml"}
          style={{ ...tbtn(false), borderColor: parsed && inputType!=="xml" ? "#10b981":"",
            color: parsed && inputType!=="xml" ? "#10b981" : T.mute2,
            cursor: parsed && inputType!=="xml" ? "pointer":"not-allowed" }}>⌥ Format</button>
        <button onClick={minify} disabled={!parsed || inputType==="xml"}
          style={{ ...tbtn(false), cursor: parsed && inputType!=="xml" ? "pointer":"not-allowed",
            color: parsed && inputType!=="xml" ? T.text : T.mute2 }}>⊟ Minify</button>
        <div style={{ width:1, height:14, background: T.border }} />
        <button onClick={copy} disabled={!parsed}
          style={{ ...tbtn(false), color: parsed ? T.text : T.mute2,
            cursor: parsed ? "pointer":"not-allowed" }}>{copyLabel}</button>
        <button onClick={clear}
          style={{ ...tbtn(false), color: T.mute }}>✕</button>
        <div style={{ flex:1 }} />
        <span style={{ fontSize:10, color: T.mute2 }}>
          {new Blob([input]).size > 0 ? `${new Blob([input]).size} B` : ""}
        </span>
      </div>

      {/* ── Main ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* Left — textarea input */}
        <div style={{ ...col, width:"45%", borderRight:`1px solid ${T.border}` }}>
          <div style={{ flexShrink:0, padding:"4px 12px", borderBottom:`1px solid ${T.border}`,
            background: T.bg, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", flexShrink:0,
              background: inputType==="xml" ? "#f59e0b":"#10b981", display:"inline-block" }}/>
            <span style={{ fontSize:10, color: T.mute, letterSpacing:"0.1em" }}>INPUT</span>
          </div>
          <textarea
            value={input}
            onChange={e => tryParse(e.target.value)}
            placeholder={"Paste JSON or XML here...\n\nOr select text on any page,\nright-click → Open in JSONcraft"}
            spellCheck={false}
            style={{ flex:1, resize:"none", border:"none", outline:"none", padding:10,
              background: T.bg, color: T.text, fontSize:11, lineHeight:1.6,
              fontFamily:"inherit", width:"100%" }}
          />
        </div>

        {/* Right — output */}
        <div style={{ ...col, flex:1 }}>
          {/* Tabs */}
          <div style={{ flexShrink:0, borderBottom:`1px solid ${T.border}`,
            background: T.bg, display:"flex", padding:"0 8px" }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                padding:"7px 9px", fontSize:10, letterSpacing:"0.06em", textTransform:"uppercase",
                border:"none", borderBottom: activeTab===tab ? "2px solid #10b981":"2px solid transparent",
                background:"transparent", cursor:"pointer", transition:"all 0.12s",
                color: activeTab===tab ? "#10b981" : T.mute, fontFamily:"inherit",
              }}>{tab}</button>
            ))}
          </div>

          <div style={{ flex:1, minHeight:0, overflowY:"auto", overflowX:"hidden",
            padding:10, background: T.bg }}>

            {error && (
              <div style={{ display:"flex", gap:8, background:"rgba(127,29,29,0.25)",
                border:"1px solid #7f1d1d", borderRadius:6, padding:10, marginBottom:10 }}>
                <span style={{ color:"#f87171", flexShrink:0 }}>✗</span>
                <div>
                  <div style={{ fontSize:11, fontWeight:600, color:"#fecaca", marginBottom:2 }}>
                    Invalid {inputType === "xml" ? "XML" : "JSON"}
                  </div>
                  <div style={{ fontSize:10, opacity:0.8, color:"#fca5a5" }}>{error}</div>
                </div>
              </div>
            )}

            {!input && !error && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center",
                justifyContent:"center", height:"80%", gap:8, opacity:0.12, userSelect:"none" }}>
                <div style={{ fontSize:36, fontWeight:700, color: T.mute }}>{"{}"}</div>
                <div style={{ fontSize:11, color: T.mute }}>Paste JSON or XML</div>
              </div>
            )}

            {parsed && activeTab === "tree"    && <TreeView data={parsed} dark={dark} />}
            {parsed && activeTab === "search"  && <SearchPanel data={parsed} dark={dark} />}
            {parsed && activeTab === "convert" && <ConvertPanel data={parsed} input={input} inputType={inputType} dark={dark} />}
            {parsed && activeTab === "types"   && <TypesPanel data={parsed} dark={dark} />}
            {parsed && activeTab === "raw"     && (
              <pre style={{ fontSize:11, color: dark?"#d1d5db":"#374151", lineHeight:1.6,
                whiteSpace:"pre-wrap", wordBreak:"break-word", margin:0 }}>
                {JSON.stringify(parsed, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ flexShrink:0, padding:"4px 12px", borderTop:`1px solid ${T.border}`,
        background: T.bg, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <span style={{ fontSize:10, color: error ? "#f87171" : parsed ? "#10b981" : T.mute2 }}>
          {error ? "✗ Invalid" : parsed ? `✓ Valid ${inputType.toUpperCase()}` : "Ready"}
        </span>
        <a href="https://jsoncraft-red.vercel.app" target="_blank" rel="noreferrer"
          style={{ fontSize:10, color: T.mute2, textDecoration:"none" }}>
          jsoncraft.in
        </a>
      </div>
    </div>
  );
}