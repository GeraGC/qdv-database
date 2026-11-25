"""Level selection on the table page, in headless Chromium (DevTools protocol): no level in the URL gives the default
level; "none" gives an empty table and level= in the URL; ticking and "all" swap the data without reloading the
page; a stale filter (Dco absent from the new levels) is dropped; reloading with level= stays empty.
Usage (any Python with websocket-client, chromium on the machine): python tests/site_levels.py [--port 8765]"""
import argparse, json, shutil, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import site_timings as st


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--port", type=int, default=8765); args = ap.parse_args()
    base = f"http://localhost:{args.port}/jvalues.html"
    dbg = st.free_port(); prof = tempfile.mkdtemp()
    chrome = subprocess.Popen(["chromium", "--headless=new", "--disable-gpu", "--no-sandbox", f"--remote-debugging-port={dbg}",
                               f"--user-data-dir={prof}", "--window-size=1500,1000", "about:blank"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    results, ok = [], True
    try:
        for _ in range(100):
            try:
                pages = json.loads(urllib.request.urlopen(f"http://localhost:{dbg}/json/list").read()); break
            except Exception:
                time.sleep(0.1)
        page = st.Page(next(p for p in pages if p["type"] == "page")["webSocketDebuggerUrl"])
        page.call("Page.enable")
        ready = "document.getElementById('perf') && document.getElementById('perf').dataset.nav_ready_ms"
        state = """(() => ({rows: document.getElementById('perf').dataset.rows, url: location.search,
          checked: [...document.querySelectorAll('#levels input:checked')].map(x => x.value), marker: window.__marker || null,
          status: document.getElementById('status').textContent}))()"""

        def check(name, cond, st_):
            nonlocal ok
            ok &= bool(cond)
            results.append({"step": name, "ok": bool(cond), **st_})
            print(("OK  " if cond else "FAIL"), name, st_, flush=True)

        page.call("Page.navigate", url=base); page.wait(ready); time.sleep(0.3)
        s = page.eval(state); check("default level when the URL has none", s["checked"] == ["5_6_1"] and s["rows"] == "1824", s)
        page.eval("window.__marker = 'same page'")  # survives only if the page is not reloaded
        page.eval("document.getElementById('levels-none').click()"); time.sleep(0.5)
        s = page.eval(state); check("none: empty table, level= in the URL", s["rows"] == "0" and "level=" in s["url"] and not s["checked"], s)
        page.eval("""(() => { const c = document.querySelector('#levels input[value="7_6_5"]'); c.checked = true; c.dispatchEvent(new Event('change')); })()"""); time.sleep(0.8)
        s = page.eval(state); check("tick 7.6.5: its 640 values, no reload", s["rows"] == "640" and s["marker"] == "same page", s)
        page.eval("document.getElementById('levels-all').click()"); time.sleep(1.5)
        s = page.eval(state); check("all: 13,120 values, no reload", s["rows"] == "13120" and s["marker"] == "same page", s)
        # a filter value absent from the new selection is dropped
        page.call("Page.navigate", url=base + "?level=5_6_1&Dco=8"); page.wait(ready); time.sleep(0.3)
        page.eval("""(() => { document.querySelector('#levels input[value="5_6_1"]').checked = false;
          const c = document.querySelector('#levels input[value="7_6_5"]'); c.checked = true; c.dispatchEvent(new Event('change')); })()"""); time.sleep(0.8)
        s = page.eval(state); check("switch 5.6.1 (Dco=8) -> 7.6.5: Dco filter dropped", s["rows"] == "640" and "Dco=" not in s["url"], s)
        page.call("Page.navigate", url=base + "?level="); page.wait(ready); time.sleep(0.3)
        s = page.eval(state); check("reload with level= stays empty", s["rows"] == "0" and not s["checked"], s)
    finally:
        chrome.terminate(); shutil.rmtree(prof, ignore_errors=True)
    (st.REPO / "results/site_levels.json").write_text(json.dumps(results, indent=1))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
