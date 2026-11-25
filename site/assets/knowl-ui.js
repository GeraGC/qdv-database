// Knowl popovers: any element with data-knowl="<id>" opens a short explanation (assets/knowls.js) next to it, with a
// link to the full page knowl.html?id=<id>. KaTeX is loaded on first use, so pages without math stay light.
import { KNOWLS } from "./knowls.js";

let katexPromise = null;

export function ensureKatex() {
  if (window.katex) return Promise.resolve();
  if (!katexPromise) {
    katexPromise = new Promise((resolve, reject) => {
      if (!document.querySelector('link[href$="katex.min.css"]')) {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "vendor/katex-0.16.47/katex.min.css";
        document.head.appendChild(css);
      }
      const s = document.createElement("script");
      s.src = "vendor/katex-0.16.47/katex.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  return katexPromise;
}

/** Render the $...$ segments of an HTML string with KaTeX (left as text when KaTeX is unavailable). */
export function renderMath(html) {
  return html.replace(/\$([^$]+)\$/g, (m, tex) => {
    if (!window.katex) return tex;
    return window.katex.renderToString(tex, { throwOnError: false });
  });
}

/** HTML of a clickable term opening the knowl ``id``. */
export const kn = (id, text) => `<span class="kn" data-knowl="${id}" tabindex="0" role="button">${text}</span>`;
/** A small ⓘ opening the knowl ``id`` (for column headers and headings). */
export const ki = (id) => `<span class="ki" data-knowl="${id}" tabindex="0" role="button" aria-label="Explain" title="What is this?">ⓘ</span>`;

let pop = null;

function closeKnowl() {
  if (pop) {
    pop.remove();
    pop = null;
  }
}

export async function openKnowl(anchor, id) {
  const k = KNOWLS[id];
  // measured before closing: the anchor may be a term inside the popover being replaced
  const r = anchor.getBoundingClientRect();
  closeKnowl();
  if (!k) {
    console.warn("unknown knowl", id);
    return;
  }
  await ensureKatex().catch(() => {});
  pop = document.createElement("div");
  pop.className = "knowl-pop";
  pop.setAttribute("role", "dialog");
  pop.setAttribute("aria-label", k.title);
  pop.innerHTML = `
    <div class="knowl-head"><strong>${k.title}</strong>${k.reviewed ? "" : ' <span class="badge warn" title="Not yet reviewed by the authors">draft</span>'}
      <button class="knowl-close" aria-label="Close">×</button></div>
    <div class="knowl-body">${renderMath(k.short)}</div>
    <div class="knowl-foot"><a href="knowl.html?id=${id}">More</a> · <a href="help.html">All explanations</a></div>`;
  document.body.appendChild(pop);
  pop.querySelector(".knowl-close").addEventListener("click", closeKnowl);
  const width = pop.offsetWidth;
  const left = Math.max(8, Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - width - 8));
  pop.style.left = `${left}px`;
  pop.style.top = `${window.scrollY + r.bottom + 6}px`;
}

export function initKnowls() {
  // capture phase: a click on a knowl inside a table header must not also sort the column
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-knowl]");
    if (t) {
      e.preventDefault();
      e.stopPropagation();
      openKnowl(t, t.dataset.knowl);
      return;
    }
    if (pop && !pop.contains(e.target)) closeKnowl();
  }, true);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeKnowl();
    const t = e.target.closest && e.target.closest("[data-knowl]");
    if (t && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openKnowl(t, t.dataset.knowl);
    }
  });
}
