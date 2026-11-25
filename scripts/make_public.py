"""Update the public branch ``public`` (pushed as ``main`` of the public repository) from the internal tree.

The internal history (STATUS.md, cluster launchers, run logs, notes) is never pushed. This script keeps an orphan
branch ``public`` in the worktree ``build/public`` whose files are an explicit allowlist of the internal tree, with
absolute paths stripped from text files (as in scripts/build_site.py), then runs tests/check_public.py on it and
commits only when it is clean. Push with ``git push origin public:main``.

Usage: python3 scripts/make_public.py [--message "..."]
"""
import argparse
import fnmatch
import shutil
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO / "scripts"))
from build_site import HOME, PROJECT  # noqa: E402

WORKTREE = REPO / "build/public"
BRANCH = "public"
# (source pattern, target) -- target None keeps the path
ALLOW = [
    ("README.public.md", "README.md"), ("SCHEMA.md", None), ("LICENSE", None), ("LICENSE-DATA.txt", None),
    ("CITATION.cff", None), ("RELEASING.md", None),
    ("exporter/*.py", None), ("exporter/levels.json", None),
    ("scripts/build_site.py", None), ("scripts/package_release.py", None), ("scripts/make_public.py", None),
    ("scripts/make_pages.sh", None),
    ("tests/check_export.py", None), ("tests/check_knowls.py", None), ("tests/check_public.py", None),
    ("tests/site_check.sh", None), ("tests/site_timings.py", None), ("tests/site_levels.py", None),
    ("site/*", None), ("site/**/*", None),
    ("results/check_export_*.json", None), ("results/site_selftest.json", None),
]
PUBLIC_GITIGNORE = "build/\nlogs/\n__pycache__/\n*.pyc\n"


def git(*args, cwd=REPO, check=True):
    return subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, check=check).stdout.strip()


def tracked_files(include_untracked=False):
    files = git("ls-files").splitlines()
    if include_untracked:  # dry runs: also the files not yet committed
        files += git("ls-files", "--others", "--exclude-standard").splitlines()
    return files


def clean_text(text: str) -> str:
    return text.replace(PROJECT + "/", "").replace(PROJECT, ".").replace(HOME + "/", "~/").replace(HOME, "~")


def ensure_worktree():
    if (WORKTREE / ".git").exists():
        return
    WORKTREE.parent.mkdir(parents=True, exist_ok=True)
    branches = git("branch", "--list", BRANCH)
    if branches:
        git("worktree", "add", str(WORKTREE), BRANCH)
    else:
        git("worktree", "add", "--detach", str(WORKTREE))
        git("checkout", "--orphan", BRANCH, cwd=WORKTREE)
        git("rm", "-rf", "--quiet", ".", cwd=WORKTREE, check=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--message", default=None)
    ap.add_argument("--dry-run", metavar="DIR", help="copy and check into DIR only (no git, uncommitted files allowed)")
    args = ap.parse_args()
    global WORKTREE
    if args.dry_run:
        WORKTREE = Path(args.dry_run)
        WORKTREE.mkdir(parents=True, exist_ok=True)
    else:
        if git("status", "--porcelain", "--untracked-files=no"):
            sys.exit("the internal tree has uncommitted changes: commit first, so the public commit can name its source")
        ensure_worktree()
    for p in WORKTREE.iterdir():  # start from an empty tree (keep .git)
        if p.name == ".git":
            continue
        shutil.rmtree(p) if p.is_dir() else p.unlink()
    copied = []
    for f in tracked_files(include_untracked=bool(args.dry_run)):
        for pattern, target in ALLOW:
            if fnmatch.fnmatch(f, pattern):
                dst = WORKTREE / (target or f)
                dst.parent.mkdir(parents=True, exist_ok=True)
                src = REPO / f
                try:
                    dst.write_text(clean_text(src.read_text()))
                except UnicodeDecodeError:
                    shutil.copy2(src, dst)
                copied.append(target or f)
                break
    (WORKTREE / ".gitignore").write_text(PUBLIC_GITIGNORE)
    check = subprocess.run([sys.executable, str(REPO / "tests/check_public.py"), str(WORKTREE)], capture_output=True, text=True)
    print(check.stdout)
    if check.returncode != 0:
        sys.exit("private details found in the public tree: not committed")
    if args.dry_run:
        print(f"dry run: {len(copied)} files in {WORKTREE}, clean")
        return
    git("add", "-A", cwd=WORKTREE)
    if not git("status", "--porcelain", cwd=WORKTREE):
        print(f"{len(copied)} files, no change")
        return
    head = git("rev-parse", "--short", "HEAD")
    msg = args.message or f"Update from the internal tree {head}"
    git("commit", "-q", "-m", msg, cwd=WORKTREE)
    print(f"{len(copied)} files; committed on {BRANCH}: {git('log', '--oneline', '-1', cwd=WORKTREE)}")


if __name__ == "__main__":
    main()
