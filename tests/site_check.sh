#!/bin/bash
# Headless browser checks of the built site, on a machine with chromium:
#   python3 -m http.server 8765 --directory build/site &      (or scripts/serve.sh in the internal tree)
#   bash tests/site_check.sh 8765
# Writes results/site_selftest.json, results/site_timings.json and results/screenshots/*.png.
PORT=${1:-8765}
BASE=http://localhost:$PORT
OUT=~/DarmonVonk/dvk-database/results
CHROME="timeout 120 chromium --headless=new --disable-gpu --no-sandbox --hide-scrollbars --user-data-dir=$(mktemp -d)"
echo "host $(hostname), chromium $(chromium --version 2>/dev/null), dvk-database $(git -C ~/DarmonVonk/dvk-database rev-parse --short HEAD 2>/dev/null || echo ?), started $(date)"
dom() { $CHROME --virtual-time-budget=30000 --dump-dom "$1" 2>/dev/null; }
# 1. self-test of the JavaScript helpers
dom "$BASE/selftest.html?level=all" | python3 -c "
import sys, re, html, json
m = re.search(r'<pre id=\"result\"[^>]*>(.*?)</pre>', sys.stdin.read(), re.S)
r = json.loads(html.unescape(m.group(1))) if m else {'error': 'no result'}
open('$OUT/site_selftest.json', 'w').write(json.dumps(r, indent=1))
print('selftest:', json.dumps({k: r.get(k) for k in ('levels', 'rows', 'points', 'n_failures', 'ms', 'error')}))
"
# 2. real-time timings through the DevTools protocol (tests/site_timings.py; virtual time would compress them)
~/miniforge3/envs/sage/bin/python ~/DarmonVonk/dvk-database/tests/site_timings.py --port $PORT
# 3. screenshots
shot() { $CHROME --virtual-time-budget=20000 --window-size=$3 --screenshot="$OUT/screenshots/$2.png" "$1" >/dev/null 2>&1 && echo "screenshot $2"; }
shot "$BASE/index.html" front 1300,800
shot "$BASE/jvalues.html?level=5_6_1" jvalues 1500,1000
shot "$BASE/jvalues.html?level=5_6_1&lindep=unverified" jvalues_unverified 1500,700
shot "$BASE/point.html?label=5.6.1-8.53-0.0-Je" point_8_53_Je 1300,3000
shot "$BASE/point.html?label=5.6.1-53.93-0.0-Je" point_53_93_unverified 1300,3000
shot "$BASE/point.html?label=5.6.1-8.53-0.0-Jp" point_8_53_Jp_mobile 390,2400
shot "$BASE/jvalues.html?level=7_6_5" jvalues_7_6_5 1700,1000
shot "$BASE/jvalues.html?level=3_10_1,3_10_7,3_14_5,5_6_1,5_6_7,5_14_3,7_6_5" jvalues_all 1700,1000
shot "$BASE/point.html?label=7.6.5-24.5-0.0-Je" point_7_6_5_support 1300,3400
shot "$BASE/precomputed.html#EO_6_1" precomputed_EO_6_1 1300,1800
shot "$BASE/help.html" help 1300,2600
shot "$BASE/knowl.html?id=field_tier" knowl_field_tier 1100,900
echo "finished $(date)"
