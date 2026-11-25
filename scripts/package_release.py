"""Package a release for Zenodo: the public site with its data, the public source tree, the licences, the citation
file, a README and the sha256 of every file, as build/release/qdv-database-<version>.zip (+ .sha256).

Needs build/site_public (scripts/build_site.py) and the branch ``public`` (scripts/make_public.py) for the same version.
Usage: python3 scripts/package_release.py --version vX.Y
"""
import argparse
import hashlib
import json
import subprocess
import sys
import zipfile
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

ARCHIVE_README = """# QDV database (quaternionic Darmon–Vonk), release {version}

This archive holds a complete, self-contained copy of the release:

- site/: the website with all its data (site/data/, described in source/SCHEMA.md);
- source/: the code that exported the data and built the site, and the checks (public branch, commit {public_commit});
- CITATION.cff, LICENSE (code, MIT), LICENSE-DATA.txt (data and texts, CC BY 4.0);
- SHA256SUMS: the sha256 of every file of the archive.

To browse it, serve the site directory over http (the pages fetch their data with JavaScript and do not work as
file:// pages):

    python3 -m http.server 8765 --directory site      # then open http://localhost:8765/

Release metadata: {release}
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--version", required=True)
    ap.add_argument("--source-dir", help="take the source from this directory (a make_public.py --dry-run) instead of "
                                         "the branch public; for tests")
    ap.add_argument("--out-dir", default=str(REPO / "build/release"))
    args = ap.parse_args()
    site = REPO / "build/site_public"
    release = json.loads((site / "data/release.json").read_text())
    if release["version"] != args.version:
        sys.exit(f"build/site_public is release {release['version']}, not {args.version}")
    import io
    import tarfile
    if args.source_dir:
        public_commit = "uncommitted (test)"
        buf = io.BytesIO()
        with tarfile.open(fileobj=buf, mode="w") as t:
            for f in sorted(Path(args.source_dir).rglob("*")):
                if f.is_file():
                    t.add(f, arcname=str(f.relative_to(args.source_dir)))
        source = buf.getvalue()
    else:
        public_commit = subprocess.run(["git", "-C", str(REPO), "rev-parse", "--short", "public"], capture_output=True,
                                       text=True, check=True).stdout.strip()
        source = subprocess.run(["git", "-C", str(REPO), "archive", "--format=tar", "public"], capture_output=True,
                                check=True).stdout
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    out = out_dir / f"qdv-database-{args.version}.zip"
    root = f"qdv-database-{args.version}"
    sums = []
    with zipfile.ZipFile(out, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        def add(name, data):
            z.writestr(f"{root}/{name}", data)
            sums.append(f"{hashlib.sha256(data).hexdigest()}  {name}")
        for f in sorted(site.rglob("*")):
            if f.is_file():
                add(f"site/{f.relative_to(site)}", f.read_bytes())
        with tarfile.open(fileobj=io.BytesIO(source)) as tar:
            for m in tar.getmembers():
                if m.isfile():
                    add(f"source/{m.name}", tar.extractfile(m).read())
        for name in ("CITATION.cff", "LICENSE", "LICENSE-DATA.txt"):
            add(name, (REPO / name).read_bytes())
        add("README.md", ARCHIVE_README.format(version=args.version, public_commit=public_commit,
                                               release=json.dumps(release)).encode())
        z.writestr(f"{root}/SHA256SUMS", "\n".join(sums) + "\n")
    digest = hashlib.sha256(out.read_bytes()).hexdigest()
    (out_dir / f"{out.name}.sha256").write_text(f"{digest}  {out.name}\n")
    print(f"{out} {out.stat().st_size / 1e6:.1f} MB, {len(sums)} files, sha256 {digest}")


if __name__ == "__main__":
    main()
