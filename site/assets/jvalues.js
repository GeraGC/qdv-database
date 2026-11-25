// Browse page of the J values: level selection, filters (kept in the URL), virtual table, copy to Sage.
import { getCatalog, getJSON, getPoint, bulkSage, copyText, esc, renderFooter, perfMark, PARITIES } from "./common.js";
import { initKnowls, kn, ki } from "./knowl-ui.js";

const T0 = performance.now();

// Filters on index columns. "values" fixes the order of the options; otherwise they are taken from the data.
// "knowl": the explanation opened by clicking the filter name.
const FILTERS = [
  { key: "Dco", label: "D<sub>co</sub>", numeric: true, knowl: "discriminants" },
  { key: "Dcy", label: "D<sub>cy</sub>", numeric: true, knowl: "discriminants" },
  { key: "parity", label: "Parity", values: PARITIES, knowl: "parity" },
  { key: "cert", label: "Certificates", values: ["agree", "single", "conflict", "none"], knowl: "certificates" },
  { key: "cert_degree", label: "Degree", numeric: true, knowl: "cert_degree" },
  { key: "field", label: "Field of J", values: ["trivial", "in_H", "generating", "outside_H", "undecided"], knowl: "field_tier" },
  { key: "lindep", label: "Lindep", values: ["ok", "unverified", "none"], knowl: "lindep" },
  { key: "support", label: "Support lindep", values: ["ok", "unverified", "none"], knowl: "support_lindep" },
  { key: "in_field", label: "In-field", values: [true, false], show: (v) => (v ? "accepted" : "not found"), knowl: "in_field" },
  { key: "algdep", label: "Algdep", values: ["success", "returned", "none"], knowl: "algdep" },
  { key: "v", label: "v(J)", numeric: true, knowl: "padic_field" },
];

const CERT_CLASS = { agree: "ok", single: "info", conflict: "bad", none: "" };
const FIELD_CLASS = { generating: "ok", in_H: "ok", trivial: "", outside_H: "warn", undecided: "bad" };
const LINDEP_CLASS = { ok: "ok", unverified: "bad", none: "" };

const state = { levels: [], filters: {}, search: "", primes: "" };
let table = null;
let allRows = [];

function readURL() {
  const q = new URLSearchParams(location.search);
  state.levels = (q.get("level") || "").split(",").filter(Boolean);
  for (const f of FILTERS) if (q.has(f.key)) state.filters[f.key] = q.get(f.key);
  state.search = q.get("q") || "";
  state.primes = q.get("primes") || "";
}

function writeURL() {
  const q = new URLSearchParams();
  if (state.levels.length) q.set("level", state.levels.join(","));
  for (const [k, v] of Object.entries(state.filters)) if (v !== "") q.set(k, v);
  if (state.search) q.set("q", state.search);
  if (state.primes) q.set("primes", state.primes);
  history.replaceState(null, "", `${location.pathname}${q.toString() ? "?" + q : ""}`);
}

async function loadLevels(catalog) {
  const levels = catalog.kinds.jvalues.levels;
  const t = performance.now();
  const indexes = await Promise.all(state.levels.map((l) => getJSON(levels[l].index)));
  perfMark("fetch_index_ms", t);
  const rows = [];
  indexes.forEach((idx, n) => {
    const cols = idx.columns;
    for (const r of idx.rows) {
      const o = { level: state.levels[n] };
      for (let c = 0; c < cols.length; c++) o[cols[c]] = r[c];
      rows.push(o);
    }
  });
  return rows;
}

function optionValues(f) {
  if (f.values) return f.values.filter((v) => allRows.some((r) => r[f.key] === v));
  const vals = [...new Set(allRows.map((r) => r[f.key]))].filter((v) => v !== null && v !== undefined);
  return f.numeric ? vals.sort((a, b) => a - b) : vals.sort();
}

function buildFilters() {
  const box = document.getElementById("filters");
  box.innerHTML = "";
  for (const f of FILTERS) {
    const opts = optionValues(f);
    const hasNull = allRows.some((r) => r[f.key] === null || r[f.key] === undefined);
    if (!opts.length && !(f.key in state.filters)) continue; // e.g. support lindeps outside 7.6.5
    const current = state.filters[f.key] ?? "";
    const show = f.show || ((v) => String(v));
    box.insertAdjacentHTML("beforeend", `<div class="filter"><span>${kn(f.knowl, f.label)}</span><select data-key="${f.key}" aria-label="${esc(f.key)}">
      <option value="">any</option>
      ${opts.map((v) => `<option value="${esc(v)}"${String(v) === current ? " selected" : ""}>${esc(show(v))}</option>`).join("")}
      ${hasNull ? `<option value="null"${current === "null" ? " selected" : ""}>(no data)</option>` : ""}
    </select></div>`);
  }
  box.insertAdjacentHTML("beforeend", `<div class="filter"><span>${kn("primes", "Prime ℓ in the lindep relation")}</span>
    <input type="text" id="primes" placeholder="e.g. 2 or 2,3" value="${esc(state.primes)}" size="10" aria-label="primes"></div>`);
  box.insertAdjacentHTML("beforeend", `<div class="filter"><span>${kn("label", "Label contains")}</span>
    <input type="search" id="search" placeholder="e.g. 8.53-0." value="${esc(state.search)}" aria-label="label contains"></div>`);
  box.querySelectorAll("select").forEach((s) => s.addEventListener("change", () => {
    state.filters[s.dataset.key] = s.value;
    if (s.value === "") delete state.filters[s.dataset.key];
    applyFilters();
  }));
  let timer = null;
  const onText = () => { clearTimeout(timer); timer = setTimeout(applyFilters, 120); };
  document.getElementById("search").addEventListener("input", (e) => { state.search = e.target.value.trim(); onText(); });
  document.getElementById("primes").addEventListener("input", (e) => { state.primes = e.target.value.trim(); onText(); });
}

function rowMatches(r) {
  for (const [k, v] of Object.entries(state.filters)) {
    const val = r[k];
    if (v === "null") { if (val !== null && val !== undefined) return false; continue; }
    if (String(val) !== v) return false;
  }
  if (state.search && !r.label.includes(state.search)) return false;
  if (state.primes) {
    const want = state.primes.split(/[\s,]+/).filter(Boolean);
    const have = (r.primes || "").split(",");
    if (!want.every((q) => have.includes(q))) return false;
  }
  return true;
}

function applyFilters() {
  const t = performance.now();
  table.setFilter(rowMatches);
  perfMark("filter_ms", t);
  writeURL();
}

function shownRows() {
  // the same predicate as the table filter, applied to the plain rows (table.getData() would deep-clone them all)
  return allRows.filter(rowMatches);
}

function updateStatus() {
  const shown = shownRows();
  const counts = {};
  for (const r of shown) counts[r.cert ?? "no file"] = (counts[r.cert ?? "no file"] || 0) + 1;
  document.getElementById("perf").dataset.rows = String(shown.length);
  document.getElementById("status").textContent =
    `Showing ${shown.length.toLocaleString("en")} of ${allRows.length.toLocaleString("en")} values`;
  document.getElementById("breakdown").innerHTML = Object.entries(counts)
    .map(([k, n]) => `<span class="badge ${CERT_CLASS[k] || ""}">${esc(k)} ${n}</span>`).join(" ");
}

const badge = (cls) => (cell) => {
  const v = cell.getValue();
  if (v === null || v === undefined) return '<span class="muted">–</span>';
  return `<span class="badge ${cls[v] ?? ""}">${esc(v)}</span>`;
};
const boolCell = (cell) => {
  const v = cell.getValue();
  if (v === null || v === undefined) return '<span class="muted">–</span>';
  if (v === "absent") return '<span class="muted">absent</span>';
  return v ? "✓" : "✗";
};

/** A column whose header carries an ⓘ opening ``knowl``; the CSV header is the plain ``name``. */
function col(name, field, knowl, opts = {}) {
  const { html, ...rest } = opts;
  return { title: `${html || esc(name)}${knowl ? ki(knowl) : ""}`, titleDownload: name, field, ...rest };
}

function columns(multiLevel, hasSupport) {
  return [
    { formatter: "rowSelection", titleFormatter: "rowSelection", hozAlign: "center", headerSort: false, width: 34,
      download: false },
    col("Label", "label", "label", { frozen: true, width: 200,
      formatter: (c) => `<a class="lbl" href="point.html?label=${encodeURIComponent(c.getValue())}">${esc(c.getValue())}</a>` }),
    ...(multiLevel ? [col("Level", "level", "level", { width: 84 })] : []),
    col("Dco", "Dco", "discriminants", { html: "D<sub>co</sub>", width: 76, hozAlign: "right", sorter: "number" }),
    col("Dcy", "Dcy", "discriminants", { html: "D<sub>cy</sub>", width: 76, hozAlign: "right", sorter: "number" }),
    col("i", "i", "embeddings", { width: 56, hozAlign: "right", sorter: "number" }),
    col("j", "j", "embeddings", { width: 56, hozAlign: "right", sorter: "number" }),
    col("Parity", "parity", "parity", { width: 96 }),
    col("(S,c) co", "label_co", "sc_label", { width: 108 }),
    col("(S,c) cy", "label_cy", "sc_label", { width: 108 }),
    col("v", "v", "padic_field", { width: 60, hozAlign: "right", sorter: "number" }),
    col("Prec", "prec", "padic_field", { width: 84, hozAlign: "right", sorter: "number" }),
    col("Certificates", "cert", "certificates", { width: 136, formatter: badge(CERT_CLASS) }),
    col("Deg", "cert_degree", "cert_degree", { width: 76, hozAlign: "right", sorter: "number" }),
    col("Lindep", "lindep", "lindep", { width: 110, formatter: badge(LINDEP_CLASS) }),
    col("Primes", "primes", "primes", { width: 100, formatter: (cell) => esc(cell.getValue() ?? "") +
      (cell.getRow().getData().field_src === "support" ? '<sup title="from the support lindep" class="muted"> s</sup>' : "") }),
    col("Field of J", "field", "field_tier", { width: 126, formatter: (cell) => badge(FIELD_CLASS)(cell) +
      (cell.getRow().getData().field_src === "support" ? '<sup title="from the support lindep" class="muted"> s</sup>' : "") }),
    col("≅ algdep", "algdep_match", "algdep_match", { width: 108, formatter: boolCell, hozAlign: "center" }),
    col("In-field", "in_field", "in_field", { width: 98, formatter: boolCell, hozAlign: "center" }),
    col("e", "in_field_power", "in_field", { width: 60, hozAlign: "right" }),
    col("Algdep", "algdep", "algdep", { width: 106, formatter: badge({ success: "ok", returned: "info" }) }),
    ...(hasSupport ? [col("Support", "support", "support_lindep", { width: 110, formatter: badge(LINDEP_CLASS) })] : []),
    { title: `Sage${ki("sage")}`, headerSort: false, hozAlign: "center", width: 76, download: false,
      formatter: () => '<button class="copy" title="Copy the Sage line">copy</button>',
      cellClick: (e, cell) => { if (e.target.closest("button")) copyRow(cell.getRow().getData()); } },
  ];
}

function copyRow(row) {
  copyText(async () => (await getPoint(row.label)).point.sage + "\n", `Sage line of ${row.label}`);
}

function header() {
  return `Darmon–Vonk data, exported values (see the label comments); copied ${new Date().toISOString().slice(0, 19)} from ${location.href}`;
}

async function copyMany(rows) {
  if (rows.length > 300 && !confirm(`Copy ${rows.length} values? This fetches every pair file involved.`)) return;
  copyText(() => bulkSage(rows.map((r) => r.label), header()), `${rows.length} values as Sage`);
}

function killerText(k) {
  if (!k) return "none (level 1: no killer needed)";
  return `${k.name} (type ${k.type}, e(t) = ${k.eisenstein}, height ${k.height})`;
}

function levelInfo(levels) {
  const box = document.getElementById("level-info");
  box.innerHTML = state.levels.map((l) => {
    const e = levels[l];
    const killers = (e.killers || []).map((s) => JSON.parse(s));
    return `<span><strong>${l.replaceAll("_", ".")}</strong> · P${e.precision} · ${e.n_points} values · ${kn("killer", "Hecke killer")}:
      ${killers.map(killerText).map(esc).join("; ")}</span>`;
  }).join("");
}

async function main() {
  initKnowls();
  renderFooter();
  readURL();
  const catalog = await getCatalog();
  const levels = catalog.kinds.jvalues.levels;
  const names = Object.keys(levels);
  if (!state.levels.length) state.levels = [names.includes("5_6_1") ? "5_6_1" : names[0]];
  state.levels = state.levels.filter((l) => levels[l]);
  const lv = document.getElementById("levels");
  lv.insertAdjacentHTML("afterbegin", `<span class="muted small">${kn("level", "Level")} (p.D.N):</span>`);
  for (const l of names) {
    lv.insertAdjacentHTML("beforeend", `<label><input type="checkbox" value="${l}"${state.levels.includes(l) ? " checked" : ""}>
      ${l.replaceAll("_", ".")} <span class="muted small">P${levels[l].precision} · ${levels[l].n_points}</span></label>`);
  }
  lv.querySelectorAll("input").forEach((cb) => cb.addEventListener("change", () => {
    state.levels = [...lv.querySelectorAll("input:checked")].map((x) => x.value);
    writeURL();
    location.reload();
  }));
  levelInfo(levels);

  allRows = await loadLevels(catalog);
  buildFilters();
  const hasSupport = allRows.some((r) => r.support !== null && r.support !== undefined);
  const t = performance.now();
  table = new Tabulator("#table", {
    data: allRows,
    index: "label",
    height: "min(72vh, 900px)",
    layout: "fitData", // explicit widths: no measuring of the cells on each redraw
    renderVertical: "virtual",
    renderVerticalBuffer: 200, // px of rows rendered beyond the visible area
    selectableRows: true,
    selectableRowsRangeMode: "click",
    columns: columns(state.levels.length > 1, hasSupport),
    placeholder: "No values match the filters",
  });
  table.on("tableBuilt", () => {
    perfMark("table_built_ms", t);
    table.setFilter(rowMatches);
    perfMark("ready_ms", T0);
    updateStatus();
  });
  table.on("dataFiltered", () => setTimeout(updateStatus, 0));
  table.on("rowSelectionChanged", (data) => {
    const b = document.getElementById("copy-selected");
    b.disabled = data.length === 0;
    b.textContent = data.length ? `Copy ${data.length} selected as Sage` : "Copy selected as Sage";
  });
  table.on("rowDblClick", (e, row) => {
    if (e.ctrlKey || e.metaKey) copyRow(row.getData());
  });
  table.on("cellDblClick", (e, cell) => {
    if (e.ctrlKey || e.metaKey) return;
    const v = cell.getValue();
    if (v !== null && v !== undefined && cell.getColumn().getField()) copyText(() => String(v), `“${v}”`);
  });
  document.getElementById("reset").addEventListener("click", () => {
    state.filters = {}; state.search = ""; state.primes = "";
    buildFilters();
    applyFilters();
  });
  document.getElementById("copy-selected").addEventListener("click", () => copyMany(table.getSelectedData()));
  document.getElementById("copy-filtered").addEventListener("click", () => copyMany(shownRows()));
  document.getElementById("csv").addEventListener("click", () =>
    table.download("csv", `jvalues_${state.levels.join("+")}.csv`, { delimiter: "," }, "active"));
}

main().catch((e) => {
  document.getElementById("status").innerHTML = `<span class="error">Could not load the data: ${esc(e.message)}</span>`;
  console.error(e);
});
