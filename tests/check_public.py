"""Scan a directory meant for publication (the built site, the public source tree, the Zenodo archive) for private
details: absolute home paths, the user name, e-mail addresses, the host names of the computing nodes and
internal tool names. Plain Python. Exit code 1 when something is found.

Usage: python3 tests/check_public.py build/site [build/public ...]
"""
import re
import sys
from pathlib import Path

USER = Path.home().name
PATTERNS = {
    "home path": re.compile(re.escape(str(Path.home()))),
    "user name": re.compile(rf"\b{re.escape(USER)}\b"),
    "e-mail": re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"),
    "cluster host": re.compile(r"(?<![\w./-])a(0[1-9]|1[0-3])(?![\w-])"),
    "tmux/ssh": re.compile(r"\b(tmux|ssh) "),
}
# text that legitimately matches (e.g. the vendored libraries' own e-mail addresses and licence texts)
ALLOW_FILES = re.compile(r"(^|/)vendor/|LICENSE|\.png$|\.woff2$|\.gz$")


def scan(root: Path):
    hits = {}
    for f in sorted(root.rglob("*")):
        if not f.is_file() or ALLOW_FILES.search(str(f.relative_to(root))) or ".git" in f.relative_to(root).parts:
            continue
        try:
            text = f.read_text()
        except UnicodeDecodeError:
            continue
        for name, pat in PATTERNS.items():
            for m in pat.finditer(text):
                hits.setdefault(name, []).append(f"{f.relative_to(root)}: …{text[max(0, m.start() - 40):m.end() + 40]!r}…")
    return hits


def main():
    bad = 0
    for arg in sys.argv[1:]:
        hits = scan(Path(arg))
        print(f"== {arg}: " + (", ".join(f"{k}: {len(v)}" for k, v in hits.items()) or "clean"))
        for k, v in hits.items():
            for line in v[:5]:
                print(f"   [{k}] {line}")
        bad += sum(len(v) for v in hits.values())
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
