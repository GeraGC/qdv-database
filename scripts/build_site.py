"""Assemble the static site: ``site/`` plus the export ``build/data`` -> ``build/site`` (what GitHub Pages serves).

The public build (default) strips private details from the data, as decided on 2026-11-25:
  - absolute paths become relative to the project root (``/home/<user>/DarmonVonk/datasets/...`` -> ``datasets/...``);
  - host names (keys ``host``, ``hostname``) are dropped.
Commits, dates, sessions and sha256 are kept. The internal manifests (``build/data/manifests``) are not published.
``data/release.json`` records the release version, date, DOI and the internal commit of the build.

Pure Python (no Sage). Prints the raw and gzip sizes of the files a visitor loads.
Usage: python3 scripts/build_site.py [--version v1.0] [--doi 10.5281/zenodo.N] [--concept-doi ...] [--repo-url URL]
                                     [--keep-private] [--data build/data] [--out build/site]
"""

import argparse
import datetime
import gzip
import json
import re
import shutil
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
HOME = str(Path.home())
PROJECT = str(Path.home() / "DarmonVonk")
DROP_KEYS = {"host", "hostname"}


def sanitize(obj):
    """Strip absolute paths (relative to the project root, or ~) and host-name keys, recursively."""
    if isinstance(obj, dict):
        return {k: sanitize(v) for k, v in obj.items() if k not in DROP_KEYS}
    if isinstance(obj, list):
        return [sanitize(v) for v in obj]
    if isinstance(obj, str) and HOME in obj:
        s = obj.replace(PROJECT + "/", "").replace(PROJECT, ".").replace(HOME + "/", "~/").replace(HOME, "~")
        return s
    return obj


def cff_authors(path: Path) -> list:
    """Authors of CITATION.cff ("Given Family"), skipping the placeholders."""
    if not path.exists():
        return []
    text = path.read_text()
    out = []
    for fam, giv in re.findall(r'family-names:\s*"?([^"\n]+)"?\s*\n\s*given-names:\s*"?([^"\n]+)"?', text):
        if not fam.startswith("AUTHOR"):
            out.append(f"{giv.strip()} {fam.strip()}")
    return out


def cff_title(path: Path):
    m = re.search(r'^title:\s*"([^"]+)"', path.read_text(), re.M) if path.exists() else None
    return m.group(1) if m else None


def git(*args):
    try:
        return subprocess.run(["git", "-C", str(REPO), *args], capture_output=True, text=True, check=True,
                              timeout=30).stdout.strip()
    except Exception:
        return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", default=str(REPO / "build/data"))
    ap.add_argument("--out", default=str(REPO / "build/site"))
    ap.add_argument("--version", default=None, help="release version, e.g. v1.0 (default: unreleased build)")
    ap.add_argument("--doi", default=None, help="version DOI of the Zenodo record of this release")
    ap.add_argument("--concept-doi", default=None, help="concept DOI (all versions) of the Zenodo record")
    ap.add_argument("--repo-url", default="https://github.com/GeraGC/qdv-database",
                    help="public repository URL (for the SCHEMA and source links)")
    ap.add_argument("--keep-private", action="store_true", help="internal build: do not strip paths and hosts")
    args = ap.parse_args()
    out = Path(args.out)
    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(REPO / "site", out)
    data_in = Path(args.data)
    n_json = 0
    for src in sorted(data_in.rglob("*")):
        rel = src.relative_to(data_in)
        if rel.parts[0] == "manifests" or src.is_dir():
            continue
        dst = out / "data" / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.suffix == ".json" and not args.keep_private:
            text = src.read_text()
            obj = sanitize(json.loads(text))
            compact = "\n" not in text.strip()
            dst.write_text(json.dumps(obj, separators=(",", ":")) if compact else json.dumps(obj, indent=1))
            n_json += 1
        else:
            shutil.copy2(src, dst)
    head = git("rev-parse", "HEAD")
    dirty = bool(git("status", "--porcelain", "--untracked-files=no"))
    release = {"version": args.version or "unreleased", "built": datetime.datetime.now().isoformat(timespec="seconds"),
               "doi": args.doi, "concept_doi": args.concept_doi, "repo_url": args.repo_url,
               "authors": cff_authors(REPO / "CITATION.cff"), "title": cff_title(REPO / "CITATION.cff"),
               "build_commit": head, "build_dirty": dirty, "public": not args.keep_private}
    (out / "data/release.json").write_text(json.dumps(release, indent=1))
    (out / ".nojekyll").write_text("")  # GitHub Pages: serve the files as they are
    print(f"built {out} ({'public' if not args.keep_private else 'internal'}; {n_json} JSON files sanitized); "
          f"release {release['version']}, commit {head[:8] if head else '?'}{' (dirty)' if dirty else ''}")
    for rel in ["index.html", "jvalues.html", "point.html", "precomputed.html", "help.html", "assets/common.js",
                "assets/jvalues.js", "assets/point.js", "assets/knowls.js", "assets/style.css",
                "vendor/tabulator-6.6.1/tabulator.min.js", "vendor/katex-0.16.47/katex.min.js",
                "data/catalog.json", "data/precomputed/tree.json"] + \
            sorted(str(p.relative_to(out)) for p in (out / "data/jvalues").glob("*/index.json")):
        raw = (out / rel).read_bytes()
        print(f"  {rel:55s} {len(raw):>10,d} B   gzip {len(gzip.compress(raw, 9)):>9,d} B")
    pairs = list((out / "data/jvalues").glob("*/pairs/*.json"))
    sizes = sorted(len(gzip.compress(p.read_bytes(), 9)) for p in pairs)
    if sizes:
        print(f"  {len(pairs)} pair files, gzip: median {sizes[len(sizes) // 2]:,d} B, max {sizes[-1]:,d} B")
    total = sum(p.stat().st_size for p in out.rglob("*") if p.is_file())
    print(f"  total {total / 1e6:.1f} MB in {sum(1 for p in out.rglob('*') if p.is_file())} files")


if __name__ == "__main__":
    main()
