// Page of one J value: point.html?label=p.D.N-Dco.Dcy-i.j-parity
import {
  getCatalog, getPoint, parseLabel, makeLabel, copyText, esc, tex, polyTex, embLabel,
  padicTex, shortDigits, renderFooter, perfMark, PARITIES, PARITY_TEX,
} from "./common.js";
import { initKnowls, kn, ki } from "./knowl-ui.js";

const T0 = performance.now();
const TEX_LIMIT = 220; // longer polynomials are shown as text

const CERT_TEXT = {
  agree: "all counted methods give the same canonical polynomial",
  single: "only one method recognized the value",
  conflict: "the counted methods give different canonical polynomials",
  none: "no method recognized the value",
};
const CERT_CLASS = { agree: "ok", single: "info", conflict: "bad", none: "" };

function polyBlock(s) {
  if (s === null || s === undefined) return '<span class="muted">–</span>';
  if (s.length <= TEX_LIMIT) return `<span class="formula" data-tex="${esc(polyTex(s))}"></span>`;
  return `<div class="bigval">${esc(s)}</div>`;
}

const yesno = (v) => (v === true ? "yes" : v === false ? "no" : v === null || v === undefined ? "–" : esc(v));

function relationTex(rel) {
  // one generator per prime ideal above ell, numbered in the stored order: g_{ell,1}, g_{ell,2}, ...
  const total = {};
  rel.forEach(([ell]) => { if (ell !== "J") total[ell] = (total[ell] || 0) + 1; });
  const seen = {};
  const terms = rel.map(([ell, c]) => {
    let base = "\\log J";
    if (ell !== "J") {
      seen[ell] = (seen[ell] || 0) + 1;
      base = total[ell] > 1 ? `\\log g_{${ell},${seen[ell]}}` : `\\log g_{${ell}}`;
    }
    const coef = c === 1 ? "" : c === -1 ? "-" : `${c}\\,`;
    return `${coef}${base}`;
  });
  return `${terms.join(" + ").replace(/\+ -/g, "- ")} + \\textstyle\\sum_k u_k \\log \\varepsilon_k = 0`;
}

function sectionValue(pt, pair) {
  const f = pair.padic_field;
  const J = pt.J;
  const unit = J.u.map((x, k) => `<div>u<sub>${k}</sub></div><div class="mono">${esc(shortDigits(x))}
      <span class="muted small">(${x.length} digits)</span></div>`).join("");
  return `
  <h2>Value${ki("padic_field")}</h2>
  <p>K<sub>p</sub> = ℚ<sub>${f.p}</sub>(g) with <span data-tex="${esc(polyTex(f.modulus.replace(/x/g, "g")))} = 0"></span>
    (Sage: <code>Qp(${f.p}, ${f.cap}).extension(${esc(f.modulus)})</code>).
    The value is stored as <span data-tex="J = ${f.p}^{v}(u_0 + u_1 g) + O(${f.p}^{P})"></span>
    with v = ${J.v} and P = ${J.prec}.</p>
  <div class="formula" data-tex-display="${esc(`${pt.parity === "Jp" ? "J^+" : pt.parity === "Jm" ? "J^-" : pt.parity === "Je" ? "J^e" : "J^o"} = ${padicTex(J, f.p, 8)}`)}"></div>
  <div class="kv">${unit}</div>
  <details><summary>All digits of u<sub>0</sub>, u<sub>1</sub></summary>
    ${J.u.map((x, k) => `<p class="small muted">u<sub>${k}</sub></p><div class="bigval">${esc(x)}</div>`).join("")}
  </details>`;
}

function sectionCertificates(pt) {
  const c = pt.certificate;
  if (!c) return `<h2>Recognition${ki("certificates")}</h2><p class="muted">No certificate comparison is stored for this value.</p>`;
  const groupOf = {};
  Object.entries(c.groups || {}).forEach(([fp, methods], n) => methods.forEach((m) => { groupOf[m] = { fp, n: n + 1 }; }));
  const rows = (c.certificates || []).map((x) => `<tr>
      <td>${esc(x.method)}</td><td>${x.degree ?? "–"}</td>
      <td>${x.digits ?? "–"} / ${x.precision ?? "–"}</td>
      <td>${yesno(x.confirmed)}</td><td>${x.counts ? "yes" : "no"}</td>
      <td>${groupOf[x.method] ? `group ${groupOf[x.method].n} <span class="muted mono small">${esc(x.fingerprint)}</span>` : "–"}</td>
      <td class="small">${esc(x.error || "")}</td></tr>`).join("");
  return `
  <h2>Recognition${ki("certificates")}</h2>
  <p><span class="badge ${CERT_CLASS[c.status] ?? ""}">${esc(c.status)}</span> ${esc(CERT_TEXT[c.status] || "")}.</p>
  <p class="small muted">Each method is reduced to the minimal polynomial over ℚ of the canonical value
    <span data-tex="\\tilde{J} = (J/p^{v(J)})^{M}"></span>, <span data-tex="M = \\operatorname{lcm}(12, p^2-1)"></span>,
    which removes the roots of unity, powers and p-powers on which the methods differ. Methods agree when these
    polynomials are equal. “Digits” is the number of p-adic digits that polynomial cancels at <span data-tex="\\tilde{J}"></span>. “Confirmed” is the
    method's own held-out check (lindep has none).</p>
  ${rows ? `<div class="scroll-x"><table class="data"><thead><tr><th>Method</th><th>Degree</th><th>Digits / precision</th><th>Confirmed</th>
    <th>Counted</th><th>Group</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>` : ""}
  ${(c.not_counted || []).length ? `<p class="note">Not counted: ${c.not_counted.map(esc).join(", ")}.</p>` : ""}`;
}

function sectionLindep(pt, p, which = "lindep") {
  const l = pt[which];
  const title = which === "lindep" ? `Lindep${ki("lindep")}` : `Support lindep${ki("support_lindep")}`;
  if (which === "lindep_support" && (l === null || l === undefined)) return "";
  if (l === null || l === undefined) return `<h2>${title}</h2><p class="muted">No relation found.</p>`;
  const root = l.root === "J'" ? `J/${p}^{v(J)}` : l.root === "J" ? "J" : null;
  const fc = l.field || {};
  return `
  <h2>${title}</h2>
  <p>Relation in H (one generator g<sub>ℓ</sub> per prime ideal above ℓ, in the stored order; the ε<sub>k</sub> are units):</p>
  <div class="formula" data-tex-display="${esc(relationTex(l.relation))}"></div>
  <div class="kv">
    <div>J exponent r</div><div>${l.remainder}</div>
    <div>root of unity order d</div><div>${l.d}${l.d === 0 ? ' <span class="muted small">(none found)</span>' : ""}</div>
    <div>${kn("primes", "primes")}</div><div>${l.primes.length ? l.primes.join(", ") : '<span class="muted">none (a unit up to p and roots of unity)</span>'}</div>
    <div>${kn("field_tier", "field checks")} of f<sub>small</sub></div><div>trivial: ${yesno(fc.trivial)} · in H: ${yesno(fc.in_H)} · generates H: ${yesno(fc.generating)}</div>
    ${which === "lindep" ? `<div>${kn("algdep_match", "≅ algdep field")}</div><div>${yesno(l.algdep_match)}</div>` : ""}
  </div>
  ${root ? `<p>The polynomial f vanishes at <span data-tex="${esc(root)}"></span>:</p>`
    : `<p class="note">Not certified: ${esc(l.error || "no certified root")}. The certificate comparison does not count this lindep; the relation above may still hold.</p>`}
  ${polyBlock(l.ff)}
  <p class="small muted">f<sub>small</sub> (polredbest, the same field; it does not vanish at J):</p>
  ${polyBlock(l.ffsmall)}`;
}

function sectionAlgdep(pt) {
  const a = pt.algdep;
  if (!a) return `<h2>Algdep${ki("algdep")}</h2><p class="muted">No algdep file.</p>`;
  const rows = Object.entries(a.degrees).map(([d, r]) => {
    if (!r) return `<h3>Degree ${d}</h3><p class="muted">No relation.</p>`;
    const tw = r.twist || {};
    return `<h3>Degree ${d}</h3>
      <div class="kv">
        <div>root power pw</div><div>${tw.pw ?? "–"} <span class="muted small">(z<sup>pw</sup> = J·ζ)</span></div>
        <div>order of ζ</div><div>${tw.zeta_order ?? "–"}</div>
        <div>z</div><div>${r.z === "J" ? "z = J" : `v = ${r.z.v}, precision ${r.z.prec} (see the JSON)`}</div>
        <div>ff(z) = 0</div><div>${yesno(tw.ff_vanishes)}</div>
      </div>
      <p class="small muted">ff:</p>${polyBlock(r.ff)}
      <p class="small muted">ffsmall:</p>${polyBlock(r.ffsmall)}
      ${tw.J_poly ? `<p class="small muted">polynomial of J (de-rooted):</p>${polyBlock(tw.J_poly)}` : ""}`;
  }).join("");
  return `<h2>Algdep${ki("algdep")}</h2><p>Status: <span class="badge">${esc(a.status ?? "–")}</span></p>${rows}`;
}

function sectionInField(pt, pair) {
  const f = pt.in_field;
  if (f === null || f === undefined) return `<h2>In-field${ki("in_field")}</h2><p class="muted">Not recognized in H.</p>`;
  const coords = (name) => `<div>${name}</div><div class="mono small">[${f[name].map((c) => esc(shortDigits(c, 16))).join(", ")}]</div>`;
  return `
  <h2>In-field${ki("in_field")}</h2>
  <p>An element x of L = ℚ(a), <span data-tex="${esc(polyTex(pair.H.replace(/x/g, "a")))} = 0"></span>, with
    <span data-tex="\\iota(x) = (J\\,\\zeta)${String(f.power) === "1" ? "" : `^{${esc(f.power)}}`}"></span> for the embedding ι with index ${f.embedding_index}
    and the root of unity with index ${f.zeta_index}. The coordinates are in the power basis of a.</p>
  <div class="kv">
    <div>form</div><div>${esc(f.form)}${f.form === "involution" ? " (x = β / s(β), a norm-one value)" : " (x = β / γ)"}</div>
    ${coords("x")}${coords("beta")}${coords("gamma")}
    <div>digits used / held out</div><div>${f.N} / ${f.held}</div>
    <div>held-out check</div><div>${yesno(f.confirmed)}</div>
  </div>`;
}

function sectionRaw(pt, pair) {
  const id = pair.identifiers[`${pt.i}.${pt.j}`];
  const p = pair.padic_field.p;
  if (!id) return "";
  const row = (name) => `<div>${name}</div><div><span data-tex="${esc(padicTex(id[name], p, 4))}"></span></div>`;
  return `
  <h2>Stored data${ki("parity")}</h2>
  <p>The datasets store the multiplicative evaluations for this pair of embeddings; the parity is
    <span data-tex="${esc(PARITY_TEX[pt.parity])}"></span>.</p>
  <div class="kv">
    ${row("Jeven")}${row("Jodd")}${row("J0")}
    <div>${kn("cycle_factor", "cycle factor")}</div><div>${id.factor} <span class="muted small">(the values are those of ${id.factor}× the cycle)</span></div>
    <div>scaling</div><div>${id.stored_scaling}</div>
    <div>file</div><div class="mono small">${esc(id.file)}</div>
  </div>`;
}

async function sectionRelated(pt, pair, catalog) {
  const L = parseLabel(pt.label);
  const parities = PARITIES.map((par) => {
    const lab = makeLabel({ ...L, parity: par });
    return par === pt.parity ? `<strong>${par}</strong>` : `<a href="point.html?label=${encodeURIComponent(lab)}">${par}</a>`;
  }).join(" · ");
  const level = catalog.kinds.jvalues.levels[L.level];
  const swappedPair = level.pairs.find((x) => x.Dco === L.Dcy && x.Dcy === L.Dco);
  let swapped = '<span class="muted">not stored</span>';
  if (swappedPair) {
    const lab = makeLabel({ ...L, Dco: L.Dcy, Dcy: L.Dco, i: L.j, j: L.i });
    swapped = `<a href="point.html?label=${encodeURIComponent(lab)}" class="mono">${esc(lab)}</a>`;
  }
  const pairLink = `jvalues.html?triplet=${L.level}&Dco=${L.Dco}&Dcy=${L.Dcy}`;
  return `
  <h2>Related values</h2>
  <div class="kv">
    <div>other parities</div><div>${parities}</div>
    <div>cocycle and cycle swapped</div><div>${swapped}</div>
    <div>this pair</div><div><a href="${pairLink}">all ${pair.points.length} values of (${L.Dco}, ${L.Dcy})</a></div>
  </div>`;
}

function sectionProvenance(pt, pair, catalog) {
  const L = parseLabel(pt.label);
  const prov = catalog.kinds.jvalues.levels[L.level].provenance;
  const files = pair.recognition_files[`${pt.i}.${pt.parity}`] || {};
  const fileRows = Object.entries(files).map(([k, v]) => `<div>${k}</div><div class="mono small">${v ? esc(v.file) : "–"}${
    v && v.generic_data && v.generic_data.code ? ` <span class="muted">(code ${esc(String(v.generic_data.code.commit).slice(0, 8))})</span>` : ""}</div>`).join("");
  const code = Object.entries(prov.code).map(([k, v]) => `${k} ${v.commit ? v.commit.slice(0, 8) : "?"}${v.dirty ? " (dirty)" : ""}`).join(" · ");
  return `
  <h2>Provenance${ki("provenance")}</h2>
  <div class="kv">
    <div>J values session</div><div class="mono small">${esc(pair.session)} (precision ${pair.precision})</div>
    <div>${kn("killer", "Hecke killer")}</div><div class="small">${esc(killerText((pair.run || {}).killer))}</div>
    <div>run</div><div class="small">${esc([(pair.run || {}).hostname, (pair.run || {}).start, (pair.run || {}).magma_version && "Magma " + pair.run.magma_version].filter(Boolean).join(" · ") || "–")}${
      (pair.run || {}).manifest ? ` <span class="mono">${esc(pair.run.manifest)}</span>` : ""}</div>
    ${fileRows}
    <div>datasets</div><div class="mono small">${esc(prov.datasets.commit || "?")}${prov.datasets.dirty ? " (dirty)" : ""}</div>
    <div>export</div><div class="small">${esc(prov.exported)} · ${esc(code)}</div>
  </div>
  <details><summary>The JSON record of this value</summary><div class="bigval" id="json"></div></details>`;
}

function killerText(k, short = false) {
  if (!k) return short ? "none" : "none (N = 1: no killer needed)";
  return short ? k.name : `${k.name} (type ${k.type}, e(t) = ${k.eisenstein}, height ${k.height})`;
}

function properties(pt, pair) {
  const c = pt.certificate || {};
  const deg = (c.certificates || []).filter((x) => x.counts).map((x) => x.degree);
  return `
  <aside class="props">
    <h2>Properties</h2>
    <dl>
      <dt>${kn("label", "Label")}</dt><dd class="mono small">${esc(pt.label)}</dd>
      <dt>${kn("triplet", "triplet")}</dt><dd><a href="jvalues.html?triplet=${pair.level}">${pair.p}.${pair.D}.${pair.N}</a></dd>
      <dt>${kn("quaternion_algebra", "D (algebra)")}</dt><dd><a href="precomputed.html#QA_${pair.D}">${pair.D}</a></dd>
      <dt>${kn("eichler_order", "N (level)")}</dt><dd><a href="precomputed.html#EO_${pair.D}_${pair.N}">${pair.N}</a></dd>
      <dt>${kn("discriminants", "D<sub>co</sub>")}</dt><dd>${pair.Dco}</dd>
      <dt>${kn("discriminants", "D<sub>cy</sub>")}</dt><dd>${pair.Dcy}</dd>
      <dt>${kn("embeddings", "cocycle emb.")}</dt><dd>${pt.i} · ${esc(embLabel(pair.labels.cocycle[pt.i]))}</dd>
      <dt>${kn("embeddings", "cycle emb.")}</dt><dd>${pt.j} · ${esc(embLabel(pair.labels.cycle[pt.j]))}</dd>
      <dt>${kn("parity", "parity")}</dt><dd>${pt.parity}</dd>
      <dt>${kn("padic_field", "v(J)")}</dt><dd>${pt.J.v ?? "–"}</dd>
      <dt>${kn("padic_field", "precision")}</dt><dd>O(${pair.p}<sup>${pt.J.prec}</sup>)</dd>
      <dt>${kn("certificates", "certificates")}</dt><dd><span class="badge ${CERT_CLASS[c.status] ?? ""}">${esc(c.status ?? "–")}</span></dd>
      <dt>${kn("cert_degree", "degree")}</dt><dd>${deg.length && deg.every((d) => d === deg[0]) ? deg[0] : "–"}</dd>
      <dt>${kn("H", "H")}</dt><dd class="small"><span data-tex="${esc(polyTex(pair.H))}"></span></dd>
      <dt>${kn("killer", "killer")}</dt><dd class="small">${esc(killerText((pair.run || {}).killer, true))}</dd>
    </dl>
    <p class="small muted">${kn("sc_label", "(S, c)")}: the primes where the orientation differs from embedding 0, and the narrow class${pair.labels && Object.values(pair.labels.cocycle || {}).some((x) => x) ? "" : " (not available for this triplet)"}.</p>
  </aside>`;
}

async function main() {
  initKnowls();
  renderFooter();
  const label = new URLSearchParams(location.search).get("label");
  const mainEl = document.getElementById("main");
  if (!parseLabel(label)) {
    mainEl.innerHTML = `<p class="error">Malformed or missing label. Labels look like <code>5.6.1-8.53-0.3-Je</code>.</p>`;
    return;
  }
  const [catalog, { pair, point: pt }] = await Promise.all([getCatalog(), getPoint(label)]);
  perfMark("fetch_ms", T0);
  document.title = `J Value ${label}`;
  const L = parseLabel(label);
  document.getElementById("nav-jvalues").href = `jvalues.html?triplet=${L.level}`;
  mainEl.innerHTML = `
    <div class="point-head">
      <h1>${esc(label)}</h1>
      <button class="btn primary" id="copy-sage">Copy Sage line</button>
      <button class="btn" id="copy-label">Copy label</button>
    </div>
    <p class="muted">${kn("jvalue", "J value")} of the cocycle of discriminant ${pair.Dco} (embedding ${pt.i}) at the cycle of discriminant
      ${pair.Dcy} (embedding ${pt.j}), parity ${pt.parity}, for p = ${pair.p} and the Eichler order of level ${pair.N} in the
      quaternion algebra of discriminant ${pair.D}.</p>
    <div class="layout">
      <div>
        ${sectionValue(pt, pair)}
        ${sectionCertificates(pt)}
        ${sectionLindep(pt, pair.p)}
        ${sectionLindep(pt, pair.p, "lindep_support")}
        ${sectionInField(pt, pair)}
        ${sectionAlgdep(pt)}
        ${sectionRaw(pt, pair)}
        ${await sectionRelated(pt, pair, catalog)}
        ${sectionProvenance(pt, pair, catalog)}
        <h2>Sage${ki("sage")}</h2>
        <p class="small muted">Rebuilds J exactly (checked for every value by <code>tests/check_export.py</code>).</p>
        <div class="bigval" id="sage-line"></div>
      </div>
      ${properties(pt, pair)}
    </div>`;
  document.getElementById("sage-line").textContent = pt.sage;
  document.getElementById("json").textContent = JSON.stringify(pt, null, 1);
  mainEl.querySelectorAll("[data-tex]").forEach((el) => tex(el, el.dataset.tex));
  mainEl.querySelectorAll("[data-tex-display]").forEach((el) => tex(el, el.dataset.texDisplay, true));
  document.getElementById("copy-sage").addEventListener("click", () => copyText(() => pt.sage + "\n", "Sage line"));
  document.getElementById("copy-label").addEventListener("click", () => copyText(() => label, "label"));
  perfMark("ready_ms", T0);
}

main().catch((e) => {
  document.getElementById("main").innerHTML = `<p class="error">Could not load this value: ${esc(e.message)}</p>`;
  console.error(e);
});
