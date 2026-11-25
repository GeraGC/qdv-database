"""Every knowl id referenced by the site (kn(), ki(), knowl: in the filters, data-knowl, knowl.html?id=, "see" lists)
exists in site/assets/knowls.js, and every entry has a title, a short text and a category. Plain Python.
Usage: python3 tests/check_knowls.py   (exit code 1 on a missing id)"""
import re
import sys
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
src = (SITE / "assets/knowls.js").read_text()
body = src[src.index("export const KNOWLS"):]
ids = re.findall(r"^  (\w+): \{", body, re.M)
cats = set(re.findall(r'\["(\w+)", "', src[:src.index("export const KNOWLS")]))
problems = []
for i, k in enumerate(ids):
    start = body.index(f"  {k}: {{")
    end = body.index(f"  {ids[i + 1]}: {{") if i + 1 < len(ids) else len(body)
    entry = body[start:end]
    for field in ("title:", "short:", "cat:", "source:", "reviewed:"):
        if field not in entry:
            problems.append(f"{k}: no {field}")
    cat = re.search(r'cat: "(\w+)"', entry)
    if cat and cat.group(1) not in cats:
        problems.append(f"{k}: unknown category {cat.group(1)}")
    for s in re.findall(r'"(\w+)"', (re.search(r"see: \[([^\]]*)\]", entry) or [None, ""])[1] if re.search(r"see: \[", entry) else ""):
        if s not in ids:
            problems.append(f"{k}: see-also id {s} missing")
used = {}
patterns = [r'\bkn\("(\w+)"', r'\bki\("(\w+)"', r'knowl: "(\w+)"', r'data-knowl="(\w+)"', r"knowl\.html\?id=(\w+)"]
for f in list(SITE.glob("*.html")) + list((SITE / "assets").glob("*.js")):
    for pat in patterns:
        for m in re.findall(pat, f.read_text()):
            used.setdefault(m, set()).add(f.name)
# links between entries: kl("id", ...) and cite("key", ...) (the entry ref_<key>) in knowls.js
for m in re.findall(r'\bkl\("(\w+)"', src):
    used.setdefault(m, set()).add("knowls.js")
for m in re.findall(r'\bcite\("(\w+)"', src):
    used.setdefault(f"ref_{m}", set()).add("knowls.js")
missing = {k: sorted(v) for k, v in used.items() if k not in ids}
unused = sorted(set(ids) - set(used))
drafts = len(re.findall(r"reviewed: false", body))
print(f"{len(ids)} knowls, {len(used)} referenced ids, {drafts} drafts")
print("missing:", missing or "none")
print("never referenced from a page (reachable from Help only):", unused)
print("entry problems:", problems or "none")
sys.exit(1 if missing or problems else 0)
