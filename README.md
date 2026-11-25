# QDV database: quaternionic Darmon–Vonk data

A browsable database of the p-adic values J of rigid meromorphic cocycles for p-arithmetic groups of quaternion
algebras (after Darmon and Vonk), evaluated at real quadratic cycles, together with the algebraic numbers they were
recognized as. It is the companion of the articles that use these computations.

- **Site:** a static website. See the site URL in the repository description, or build it locally (below).
- **Archive:** every release used in an article is archived on Zenodo with a DOI (see `CITATION.cff` and the site's
  front page).
- **Format:** [SCHEMA.md](SCHEMA.md) describes every file and field.

## What is in it

- **J values:** every value, in its four parities, at a stated p-adic precision. Each value comes with:
  - the recognitions by lindep, algdep, the in-field method and (for one triplet) the support lindep;
  - the comparison of their certificates;
  - a line of Sage code that rebuilds it exactly.
- **Quaternion algebras and groups:** the algebras, Eichler orders, candidates and optimal embeddings, and the stored
  Fuchsian and S-arithmetic groups (exact data).
- **Help pages:** what every column, filter and term means.

The recognitions are numerical evidence. The site shows, for each value, how many p-adic digits each relation
cancels, the held-out checks, and whether independent methods agree.

## Viewing the site locally

Unpack a release archive (or check out the `gh-pages` branch) and serve the directory over http:

```
python3 -m http.server 8765 --directory site      # then open http://localhost:8765/
```

The pages fetch their data with JavaScript, so they do not work when opened as local files (`file://`).

## Layout

```
site/        the static site (HTML, JavaScript, CSS; vendored Tabulator and KaTeX). Help texts: site/assets/knowls.js
exporter/    Sage scripts that export the datasets to JSON (they need the computation environment and the datasets)
scripts/     build_site.py (site + data -> build/site), package_release.py, make_public.py, make_pages.sh
tests/       check_export.py (every Sage line and recognition against the stored data), check_knowls.py,
             check_public.py, site_check.sh and site_timings.py (headless browser checks)
results/     the outputs of the checks for the published export
```

## Checks behind every release

- `tests/check_export.py` runs every Sage line in a fresh Sage session and compares the result with the stored
  value. It also checks:
  - the parity formulas on the stored raw values;
  - every lindep polynomial at its certified root;
  - every in-field identity;
  - the certificate counts.
- `tests/site_check.sh` runs a self-test of the site code on every value in a headless browser.

## Licences

The data and the texts are under CC BY 4.0 (`LICENSE-DATA.txt`) and the code under MIT (`LICENSE`). The vendored
libraries keep their own licences.
