#!/bin/bash
# Update the branch gh-pages (served by GitHub Pages) with the public build of the site, build/site_public
# (scripts/build_site.py --out build/site_public ...). The branch is an orphan with one commit per release, so the
# repository does not accumulate old data; earlier releases are kept on Zenodo. Push with: git push --force origin gh-pages
# Usage: scripts/make_pages.sh <version>
set -euo pipefail
VERSION=${1:?usage: make_pages.sh <version>}
REPO=$(cd "$(dirname "$0")/.." && pwd)
SITE=$REPO/build/site_public
WT=$REPO/build/gh-pages
[ -f "$SITE/data/release.json" ] || { echo "no $SITE: run scripts/build_site.py --out build/site_public first"; exit 1; }
grep -q "\"version\": \"$VERSION\"" "$SITE/data/release.json" || { echo "build/site_public is not release $VERSION"; exit 1; }
python3 "$REPO/tests/check_public.py" "$SITE"
if [ ! -e "$WT/.git" ]; then
  git -C "$REPO" worktree add --detach "$WT"
fi
cd "$WT"
git checkout -q --orphan "gh-pages-new"
git rm -rf -q . 2>/dev/null || true
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -a "$SITE"/. .
git add -A
git commit -q -m "Site $VERSION (built from $(git -C "$REPO" rev-parse --short HEAD))"
git branch -q -D gh-pages 2>/dev/null || true
git branch -q -m gh-pages
echo "gh-pages: $(git log --oneline -1) — $(du -sh . --exclude=.git | cut -f1)"
