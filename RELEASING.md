# Releasing a version (site + Zenodo archive)

One release per article version. The Zenodo record of the first release gets "New version"s for the later ones, so
that all versions share one concept DOI.

1. **Export and check** the data with the computation environment: `exporter/export_jvalues.py`,
   `exporter/export_precomputed.py`, then `tests/check_export.py` (0 failures required).
2. **Reserve the DOI** on Zenodo:
   - first release: zenodo.org → New upload → answer "no" to "Do you already have a DOI?" → "Get a DOI now!";
   - later releases: open the published record → "New version" → reserve.

   Note the version DOI and, once the record exists, the concept DOI.
3. **Fill in `CITATION.cff`**: authors and ORCIDs, version, date, DOI, URLs.
4. **Build the public site** with the version and the DOIs:

   ```
   python3 scripts/build_site.py --version vX.Y --doi 10.5281/zenodo.N --concept-doi 10.5281/zenodo.C \
       --repo-url https://github.com/GeraGC/qdv-database --out build/site_public
   python3 tests/check_public.py build/site_public      # must be clean
   ```

   Then run `tests/site_check.sh` against a server of `build/site_public`.
5. **Update the public branches:** `python3 scripts/make_public.py`, then `scripts/make_pages.sh vX.Y`. Both run
   `tests/check_public.py` and refuse to commit when it finds something.
6. **Package the archive:** `python3 scripts/package_release.py --version vX.Y` writes
   `build/release/qdv-database-vX.Y.zip` and its sha256.
7. **Push** (from a machine with GitHub credentials):

   ```
   git push origin public:main
   git push --force origin gh-pages
   git tag vX.Y public && git push origin vX.Y
   ```

8. **Publish on Zenodo:**
   - upload the zip to the draft with the reserved DOI;
   - fill in the metadata: resource type Dataset, title, authors, description, licence CC BY 4.0, related
     identifiers (the article, the repository, the site);
   - publish.

   Files can only be replaced within about 30 days of publication; later changes need a new version.
