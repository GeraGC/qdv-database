// Tree of the precomputed data: algebras -> Eichler orders -> (Fuchsian group, candidates, embeddings).
import { getJSON, esc, fmtBytes, embLabel, perfMark } from "./common.js";
import { initKnowls, kn } from "./knowl-ui.js";

const T0 = performance.now();
const chips = (xs) => `<div class="chips">${xs.map((x) => `<span class="chip">${esc(x)}</span>`).join("")}</div>`;

function groupBlock(g) {
  const dl = `<a href="data/${esc(g.file)}" download>download</a> (${fmtBytes(g.bytes_gz)} gz)`;
  const made = `created ${esc((g.created || "").slice(0, 10))} · darmonpoints ${esc((g.darmonpoints_commit || "").slice(0, 8))} · Magma ${esc(g.magma_version || "?")}`;
  if ((g.kind || "").startsWith("fuchsian")) {
    const ab = (g.abelian_invariants || []).map((n) => `ℤ/${n}`).join(" × ") || "trivial";
    return `<div class="leaf"><div class="kv">
      <div>${kn("fuchsian_group", "group")}</div><div>${esc(g.grouptype)} · ${g.n_generators} generators · ${(g.relation_words || []).length} relations · fundamental domain with ${g.fundamental_domain_vertices} vertices</div>
      <div>relation words</div><div class="mono small">${esc(JSON.stringify(g.relation_words))}</div>
      <div>abelianization</div><div>${ab}</div>
      <div>file</div><div class="small">${dl} · ${made}</div></div></div>`;
  }
  return `<div class="leaf"><div class="kv">
    <div>${kn("sarith_group", "S-arithmetic group")}</div><div>${esc(g.grouptype)} · from <span class="mono small">${esc(g.Gn_file)}</span> and <span class="mono small">${esc(g.Gpn_file)}</span></div>
    <div>w<sub>p</sub></div><div class="mono small">${esc(JSON.stringify(g.wp))}</div>
    <div>file</div><div class="small">${dl} · ${made}</div></div></div>`;
}

function candidateBlock(c) {
  const link = c.jvalues_exported ? ` · <a href="jvalues.html?triplet=${c.level}">J values</a>` : ' · <span class="muted">no J values exported</span>';
  return `<details id="${c.id}"><summary>${kn("candidate", "Candidate")} p = ${c.p} · triplet ${c.level.replaceAll("_", ".")}${link}<span class="id">${c.id}</span></summary>
    <div class="leaf"><div class="kv">
      <div>admissible discriminants (bound ${c.bound})</div><div>${chips(c.admissible_disc || [])}</div>
      <div>Hecke data</div><div class="mono small">${esc(c.hecke_data)}</div>
    </div></div>
    ${(c.sarith || []).map(groupBlock).join("") || '<div class="leaf muted">No S-arithmetic group stored.</div>'}
  </details>`;
}

function embeddingsBlock(e) {
  return `<details class="emb" id="${e.id}" data-emb="${e.id}"><summary>Δ = ${e.disc} · ${e.num_emb} embedding${e.num_emb === 1 ? "" : "s"}${e.labels ? " · (S, c) labels" : ""}<span class="id">${e.id}</span></summary></details>`;
}

function renderEmbeddings(el, e) {
  if (el.dataset.done) return;
  el.dataset.done = "1";
  const rows = e.embeddings.map((q, i) => `<tr><td>${i}</td><td class="mono small">${esc(q)}</td><td>${e.labels ? esc(embLabel(e.labels[i])) : "–"}</td></tr>`).join("");
  el.insertAdjacentHTML("beforeend", `<div class="leaf scroll-x"><table class="data"><thead><tr><th>index</th>
    <th>image of the generator (1, i, j, k)</th><th>${kn("sc_label", "(S, c)")}</th></tr></thead><tbody>${rows}</tbody></table></div>`);
}

function orderBlock(o) {
  return `<details id="${o.id}"><summary>${kn("eichler_order", "Eichler order")} of level N = ${o.level}<span class="id">${o.id}</span></summary>
    <div class="leaf"><div class="kv"><div>basis</div><div class="mono small">${esc(o.basis)}</div></div></div>
    ${o.fuchsian.map(groupBlock).join("") || '<div class="leaf muted">No Fuchsian group stored for this order.</div>'}
    ${o.candidates.length ? o.candidates.map(candidateBlock).join("") : ""}
    <details><summary>${kn("optimal_embedding", "Optimal embeddings")} (${o.embeddings.length} discriminants)</summary>
      ${o.embeddings.map(embeddingsBlock).join("")}
    </details>
  </details>`;
}

function algebraBlock(a) {
  const [x, y] = a.abtuple;
  return `<details id="${a.id}"><summary><strong>${kn("quaternion_algebra", "Quaternion algebra")} D = ${a.disc}</strong> ·
      (${esc(x)}, ${esc(y)})<sub>ℚ</sub> · ramified at ${a.primes.join(", ")} · ${a.orders.length} order${a.orders.length === 1 ? "" : "s"}<span class="id">${a.id}</span></summary>
    <div class="leaf"><div class="kv"><div>maximal order</div><div class="mono small">${esc(a.maxord)}</div></div></div>
    ${a.orders.map(orderBlock).join("")}
  </details>`;
}

function openHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  const el = id && document.getElementById(id);
  if (!el) return;
  for (let d = el; d; d = d.parentElement ? d.parentElement.closest("details") : null) d.open = true;
  el.scrollIntoView({ block: "start" });
}

async function main() {
  initKnowls();
  const tree = await getJSON("precomputed/tree.json");
  const embs = new Map(tree.algebras.flatMap((a) => a.orders.flatMap((o) => o.embeddings.map((e) => [e.id, e]))));
  document.getElementById("tree").innerHTML = tree.algebras.map(algebraBlock).join("");
  document.getElementById("tree").addEventListener("toggle", (ev) => {
    const el = ev.target;
    if (el.dataset && el.dataset.emb && el.open) renderEmbeddings(el, embs.get(el.dataset.emb));
  }, true);
  document.getElementById("expand").addEventListener("click", () => {
    document.querySelectorAll('.tree details[id^="QA_"], .tree details[id^="EO_"]').forEach((d) => { d.open = true; });
  });
  document.getElementById("collapse").addEventListener("click", () => document.querySelectorAll(".tree details").forEach((d) => { d.open = false; }));
  document.getElementById("tree-version").textContent =
    `Exported ${tree.exported} · datasets ${(tree.datasets.commit || "?").slice(0, 8)}${tree.datasets.dirty ? " (dirty)" : ""}`;
  window.addEventListener("hashchange", openHash);
  openHash();
  perfMark("ready_ms", T0);
}

main().catch((e) => {
  document.getElementById("tree").innerHTML = `<p class="error">Could not load the data: ${esc(e.message)}</p>`;
  console.error(e);
});
