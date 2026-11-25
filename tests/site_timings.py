"""Real-time timings of the site in headless Chromium, through the DevTools protocol (phase 2 performance budget).

For each page: cold load (cache disabled) and warm load, measured inside the page from navigation start to the
moment the table or the point is rendered (``#perf[data-nav_ready_ms]``); for the table page also the time of
filter changes made through the filter controls. Needs an http server of the built site and chromium.
Writes results/site_timings.json.  Usage: python tests/site_timings.py [--port 8765]
(any Python with the websocket-client package, on a machine with chromium).
"""
import argparse, json, os, shutil, socket, subprocess, tempfile, time, urllib.request
from pathlib import Path

import websocket

REPO = Path(__file__).resolve().parent.parent


class Page:
    def __init__(self, ws_url):
        self.ws = websocket.create_connection(ws_url, timeout=60, suppress_origin=True)
        self.n = 0

    def call(self, method, **params):
        self.n += 1
        self.ws.send(json.dumps({"id": self.n, "method": method, "params": params}))
        while True:
            msg = json.loads(self.ws.recv())
            if msg.get("id") == self.n:
                if "error" in msg:
                    raise RuntimeError(msg["error"])
                return msg.get("result", {})

    def eval(self, expr):
        r = self.call("Runtime.evaluate", expression=expr, returnByValue=True, awaitPromise=True)
        return r.get("result", {}).get("value")

    def wait(self, expr, timeout=30):
        t = time.time()
        while time.time() - t < timeout:
            v = self.eval(expr)
            if v:
                return v
            time.sleep(0.02)
        raise TimeoutError(expr)

    def perf(self):
        return self.eval("Object.assign({}, document.getElementById('perf') ? document.getElementById('perf').dataset : {})")


def free_port():
    s = socket.socket(); s.bind(("", 0)); port = s.getsockname()[1]; s.close(); return port


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8765)
    args = ap.parse_args()
    base = f"http://localhost:{args.port}"
    dbg = free_port()
    profile = tempfile.mkdtemp()
    chrome = subprocess.Popen(["chromium", "--headless=new", "--disable-gpu", "--no-sandbox", f"--remote-debugging-port={dbg}",
                               f"--user-data-dir={profile}", "--window-size=1500,1000", "about:blank"],
                              stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        for _ in range(100):
            try:
                pages = json.loads(urllib.request.urlopen(f"http://localhost:{dbg}/json/list").read())
                if pages:
                    break
            except Exception:
                time.sleep(0.1)
        page = Page(next(p for p in pages if p["type"] == "page")["webSocketDebuggerUrl"])
        page.call("Page.enable"); page.call("Network.enable")
        version = json.loads(urllib.request.urlopen(f"http://localhost:{dbg}/json/version").read())["Browser"]
        out = {"browser": version, "host": os.uname().nodename, "date": time.strftime("%Y-%m-%dT%H:%M:%S"), "loads": [], "filters": []}
        scenarios = [("jvalues", "/jvalues.html?triplet=5_6_1"),
                     ("jvalues_all_levels", "/jvalues.html?triplet=3_10_1,3_10_7,3_14_5,5_6_1,5_6_7,5_14_3,7_6_5"),
                     ("precomputed", "/precomputed.html"),
                     ("point_small_pair", "/point.html?label=5.6.1-8.53-0.0-Je"),
                     ("point_5_6_1_largest_pair", "/point.html?label=5.6.1-92.77-3.5-Jm"),
                     ("point_largest_pair_overall", "/point.html?label=3.14.5-104.101-0.0-Je")]
        for name, path in scenarios:
            for cache in ("cold", "warm"):
                page.call("Network.setCacheDisabled", cacheDisabled=(cache == "cold"))
                times = []
                for _ in range(3):
                    page.call("Page.navigate", url=base + path)
                    page.wait("document.getElementById('perf') && document.getElementById('perf').dataset.nav_ready_ms")
                    times.append(page.perf())
                out["loads"].append({"page": name, "cache": cache, "runs": times})
                print(name, cache, [t.get("nav_ready_ms") for t in times], flush=True)
        # filter changes on the table page (warm), on all levels at once
        page.call("Network.setCacheDisabled", cacheDisabled=False)
        page.call("Page.navigate", url=base + "/jvalues.html?triplet=3_10_1,3_10_7,3_14_5,5_6_1,5_6_7,5_14_3,7_6_5")
        page.wait("document.getElementById('perf') && document.getElementById('perf').dataset.nav_ready_ms")
        for key, value in [("cert", "agree"), ("parity", "Je"), ("field", "outside_H"), ("parity", ""), ("cert", "")]:
            page.eval(f"""(() => {{ const s = document.querySelector('select[data-key="{key}"]'); s.value = '{value}';
                         s.dispatchEvent(new Event('change')); }})()""")
            time.sleep(0.3)
            p = page.perf()
            out["filters"].append({"set": f"{key}={value or 'any'}", "filter_ms": p.get("filter_ms"), "rows": p.get("rows")})
            print("filter", key, value, p.get("filter_ms"), p.get("rows"), flush=True)
        page.eval("""(() => { const s = document.getElementById('search'); s.value = '5.6.1-92.77'; s.dispatchEvent(new Event('input')); })()""")
        time.sleep(0.5)
        p = page.perf()
        out["filters"].append({"set": "label contains 92.77", "filter_ms": p.get("filter_ms"), "rows": p.get("rows")})
        print("search", p.get("filter_ms"), p.get("rows"), flush=True)
        (REPO / "results/site_timings.json").write_text(json.dumps(out, indent=1))
    finally:
        chrome.terminate()
        try:
            chrome.wait(10)
        except Exception:
            chrome.kill()
        shutil.rmtree(profile, ignore_errors=True)


if __name__ == "__main__":
    main()
