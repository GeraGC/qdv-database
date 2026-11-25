// Shared helpers of the site: data loading (with a cache), labels, Sage snippets, clipboard, small formatting.
// Every page is a plain ES module; no build step. Data files are described in SCHEMA.md.

export const DATA = "data/";
const cache = new Map();

/** Fetch a JSON file of the export once (path relative to data/). */
export function getJSON(path) {
  if (!cache.has(path)) {
    cache.set(path, fetch(DATA + path).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return r.json();
    }));
  }
  return cache.get(path);
}

export const getCatalog = () => getJSON("catalog.json");

export const PARITIES = ["Jp", "Jm", "Je", "Jo"];
export const PARITY_TEX = {
  Jp: "J_+ = J_{\\mathrm{even}}\\, J_0 / J_{\\mathrm{odd}}",
  Jm: "J_- = J_{\\mathrm{even}}\\, J_{\\mathrm{odd}}\\, J_0",
  Je: "J_e = J_{\\mathrm{even}}\\, J_0",
  Jo: "J_o = J_{\\mathrm{odd}}",
};

const LABEL_RE = /^(\d+)\.(\d+)\.(\d+)-(\d+)\.(\d+)-(\d+)\.(\d+)-(J[pmeo])$/;

/** "5.6.1-8.53-0.3-Je" -> {p, D, N, Dco, Dcy, i, j, parity, level: "5_6_1"}; null if malformed. */
export function parseLabel(label) {
  const m = LABEL_RE.exec(label || "");
  if (!m) return null;
  const [p, D, N, Dco, Dcy, i, j] = m.slice(1, 8).map(Number);
  return { p, D, N, Dco, Dcy, i, j, parity: m[8], level: `${p}_${D}_${N}` };
}

export const makeLabel = (o) => `${o.p}.${o.D}.${o.N}-${o.Dco}.${o.Dcy}-${o.i}.${o.j}-${o.parity}`;
export const pairPath = (level, Dco, Dcy) => `jvalues/${level}/pairs/${Dco}_${Dcy}.json`;

/** The pair file and the point record of a label. */
export async function getPoint(label) {
  const L = parseLabel(label);
  if (!L) throw new Error(`malformed label ${label}`);
  const pair = await getJSON(pairPath(L.level, L.Dco, L.Dcy));
  const point = pair.points.find((pt) => pt.label === label);
  if (!point) throw new Error(`no point ${label}`);
  return { pair, point, parsed: L };
}

/** Split a stored Sage line (exporter.export_jvalues.sage_line) into its statements. The line is verified by
 *  tests/check_export.py; its statements are separated by "; " and never contain it. */
export function sageParts(line) {
  const cut = line.indexOf("  # ");
  const code = cut >= 0 ? line.slice(0, cut) : line;
  const comment = cut >= 0 ? line.slice(cut + 4) : "";
  const parts = code.split("; ");
  const get = (prefix) => {
    const s = parts.find((x) => x.startsWith(prefix));
    return s === undefined ? null : s.slice(prefix.length);
  };
  return { field: parts.slice(0, 2).join("; "), J: get("J = "), H: get("H.<h> = NumberField("), f: get("f = "),
           fSupport: get("f_support = "), comment };
}

/** A Sage block defining many points at once: one field per level, then dictionaries J, f, H keyed by label. */
export async function bulkSage(labels, header) {
  const byLevel = new Map();
  for (const label of labels) {
    const L = parseLabel(label);
    if (!byLevel.has(L.level)) byLevel.set(L.level, []);
    byLevel.get(L.level).push(label);
  }
  const out = [`# ${header}`, "# J[label]: the p-adic value; f[label]: lindep polynomial (see the comment for its root); H[(Dco, Dcy)]: conjectural field",
    "J = {}; f = {}; f_support = {}; H = {}"];
  const pairsDone = new Set();
  for (const [level, ls] of byLevel) {
    let lastField = null;
    out.push(`# level ${level}`);
    for (const label of ls) {
      const { point, parsed } = await getPoint(label);
      const s = sageParts(point.sage);
      if (s.field !== lastField) { out.push(s.field); lastField = s.field; } // K and g, redefined when the field changes
      out.push(`J['${label}'] = ${s.J}`);
      const rootNote = (rec) => (rec && rec.root ? `f(${rec.root === "J'" ? "J/p^v(J)" : "J"}) = 0` : "not certified");
      if (s.f) out.push(`f['${label}'] = ${s.f}  # ${rootNote(point.lindep)}`);
      if (s.fSupport) out.push(`f_support['${label}'] = ${s.fSupport}  # support lindep, ${rootNote(point.lindep_support)}`);
      const pairKey = `${level}:${parsed.Dco}_${parsed.Dcy}`;
      if (s.H && !pairsDone.has(pairKey)) {
        out.push(`H[(${parsed.Dco}, ${parsed.Dcy})] = ${s.H.replace(/\)$/, "")}`);
        pairsDone.add(pairKey);
      }
    }
  }
  return out.join("\n") + "\n";
}

// CLIPBOARD

/** Copy text produced (possibly asynchronously) by ``producer``. Uses a ClipboardItem with a promise so that the
 *  copy stays inside the user gesture even when a file has to be fetched first; falls back to a dialog with the
 *  text selected (e.g. on plain http, where the clipboard API is not available). */
export async function copyText(producer, what) {
  const textPromise = Promise.resolve().then(producer);
  try {
    if (window.isSecureContext && window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      const blob = textPromise.then((t) => new Blob([t], { type: "text/plain" }));
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })]);
      toast(`Copied ${what}`);
      return;
    }
    if (window.isSecureContext && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(await textPromise);
      toast(`Copied ${what}`);
      return;
    }
  } catch (e) {
    console.warn("clipboard API failed, falling back to a dialog", e);
  }
  showCopyDialog(await textPromise, what);
}

function showCopyDialog(text, what) {
  let dlg = document.getElementById("copy-dialog");
  if (!dlg) {
    dlg = document.createElement("dialog");
    dlg.id = "copy-dialog";
    dlg.innerHTML = `<form method="dialog"><p class="dlg-title"></p><textarea readonly spellcheck="false"></textarea>
      <p class="muted small">Press Ctrl+C (⌘C) to copy. The clipboard is only available to the page over https or localhost.</p>
      <div class="dlg-actions"><button class="btn">Close</button></div></form>`;
    document.body.appendChild(dlg);
  }
  dlg.querySelector(".dlg-title").textContent = `Copy ${what}`;
  const ta = dlg.querySelector("textarea");
  ta.value = text;
  dlg.showModal();
  ta.focus();
  ta.select();
}

export function toast(message) {
  let el = document.getElementById("toast");
  if (!el) {
    el = document.createElement("div");
    el.id = "toast";
    el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.remove("show"), 1800);
}

// FORMATTING

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/** A polynomial string in Sage syntax as TeX ("x^8 - 2*x^6 + 1/4" -> "x^{8} - 2x^{6} + \tfrac{1}{4}"). */
export function polyTex(s) {
  return String(s)
    .replace(/(\d+)\/(\d+)/g, "\\tfrac{$1}{$2}")
    .replace(/\*/g, "")
    .replace(/\^(-?\d+)/g, "^{$1}")
    .replace(/\^\(([^)]*)\)/g, "^{$1}");
}

export function tex(el, source, display = false) {
  if (window.katex) {
    window.katex.render(source, el, { throwOnError: false, displayMode: display });
  } else {
    el.textContent = source;
  }
}

/** "(S, c)" label of an embedding from [[q, ...], c]. */
export function embLabel(l) {
  if (!l) return "–";
  const [S, c] = l;
  return S.length ? `({${S.join(",")}}, ${c})` : `(∅, ${c})`;
}

/** First terms of the p-adic expansion p^v (u0 + u1 g) = sum (a_k + b_k g) p^(v+k), using BigInt. */
export function padicTerms(J, p, nTerms = 10) {
  if (J.zero) return { terms: [], more: false };
  const P = BigInt(p);
  let u = J.u.map((x) => BigInt(x));
  const terms = [];
  const total = J.prec - J.v;
  for (let k = 0; k < Math.min(nTerms, total); k++) {
    const digits = u.map((x) => x % P);
    u = u.map((x) => x / P);
    if (digits.some((d) => d !== 0n)) terms.push({ e: J.v + k, d: digits });
  }
  return { terms, more: total > nTerms };
}

export function padicTex(J, p, nTerms = 10) {
  if (J.zero) return `O(${p}^{${J.prec}})`;
  const { terms } = padicTerms(J, p, nTerms);
  const coef = (d) => {
    const [a, b] = d;
    if (b === 0n) return { s: `${a}`, simple: true };
    const gpart = b === 1n ? "g" : `${b}g`;
    return a === 0n ? { s: gpart, simple: b === 1n } : { s: `(${gpart} + ${a})`, simple: false };
  };
  const parts = terms.map(({ e, d }) => {
    const c = coef(d);
    if (e === 0) return c.s;
    const pw = e === 1 ? `${p}` : `${p}^{${e}}`;
    return c.s === "1" ? pw : `${c.s} \\cdot ${pw}`;
  });
  return `${parts.join(" + ")} + \\cdots + O(${p}^{${J.prec}})`;
}

export function shortDigits(s, keep = 24) {
  s = String(s);
  return s.length <= 2 * keep + 5 ? s : `${s.slice(0, keep)}…${s.slice(-keep)}`;
}

export function fmtBytes(n) {
  return n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.round(n / 1e3)} kB`;
}

export const getRelease = () => getJSON("release.json").catch(() => ({ version: "unreleased" }));

export const doiLink = (doi) => (doi ? `<a href="https://doi.org/${esc(doi)}">doi:${esc(doi)}</a>` : "");

/** The version line of the footer: release, DOI, data export and schema; and the link to the format description. */
export async function renderFooter() {
  const el = document.getElementById("footer-version");
  if (!el) return;
  try {
    const [cat, rel] = await Promise.all([getCatalog(), getRelease()]);
    const levels = Object.values(cat.kinds.jvalues.levels);
    const prov = levels[0] && levels[0].provenance;
    const ds = prov && prov.datasets && prov.datasets.commit ? prov.datasets.commit.slice(0, 8) : "?";
    el.innerHTML = `Release ${esc(rel.version)}${rel.doi ? " · " + doiLink(rel.doi) : ""} · data export ${esc(String(cat.updated).slice(0, 10))} · datasets ${esc(ds)} · schema v${esc(cat.schema_version)}`;
    const schema = document.getElementById("footer-schema");
    if (schema && rel.repo_url) schema.innerHTML = `Data format: <a href="${esc(rel.repo_url)}/blob/main/SCHEMA.md">SCHEMA.md</a> · <a href="${esc(rel.repo_url)}">source</a>`;
  } catch (e) {
    el.textContent = "Data version unavailable";
  }
}

export function perfMark(name, t0) {
  const el = document.getElementById("perf");
  const ms = performance.now() - t0;
  if (el) {
    el.dataset[name] = ms.toFixed(1);
    if (name === "ready_ms") el.dataset.nav_ready_ms = performance.now().toFixed(1); // since navigation start
  }
  return ms;
}
