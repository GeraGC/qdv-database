"""Export the single J values (PS = 1) of one level, with their recognitions, to the JSON bundle of the site.

Reads the datasets snapshot (``data_management.READ_PATH``) at one **pinned** precision and recomputes no
recognition. For every point (Dco, i, Dcy, j, parity) it writes the p-adic value, the lindep, algdep, in-field and
certificate records stored for it, the derived checks of the db_handlers (lindep field checks and algdep match,
algdep point status and twist data), the (S, c) labels of the embeddings (investigation (j)) and a Sage snippet.

Output (see SCHEMA.md), under ``--out`` (default ``build/data``):

    catalog.json                              data kinds, levels, provenance of the latest export of each level
    jvalues/<p_D_N>/index.json                one row of short fields per point (columnar)
    jvalues/<p_D_N>/pairs/<Dco>_<Dcy>.json    full records of the pair
    manifests/export_<p_D_N>_<stamp>.json     provenance, sha256 of every input file, counts, timings

Usage (on a compute node, through ../tmux_run.sh):
    python exporter/export_jvalues.py                      # every level of exporter/levels.json
    python exporter/export_jvalues.py --level 5_6_1 [--precision 700]
"""

from __future__ import annotations

import argparse
import datetime
import hashlib
import json
import platform
import re
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DARMONVONK = Path.home() / "DarmonVonk"
sys.path.insert(0, str(DARMONVONK / "level-computations-dev"))
sys.path.insert(0, str(REPO))

from sage.all import load  # noqa: E402

import data_management as dm  # noqa: E402
import dvk_wrappers as dvkw  # noqa: E402
from db_handlers.jvalues_db import JValuesDB  # noqa: E402
from db_handlers.lindep_db import lindepDB  # noqa: E402
from db_handlers.algdep_db import algdepDB  # noqa: E402
from db_handlers.report_utils import compute_field_checks  # noqa: E402

from exporter import encode  # noqa: E402

SCHEMA_VERSION = 2
DATASETS = Path(dm.READ_PATH)
PARITIES = ["Jp", "Jm", "Je", "Jo"]
LABELS_JSON = DARMONVONK / "investigations/j_shimura_reciprocity/results/labels.json"
LEVELS_CONFIG = REPO / "exporter/levels.json"
RECOGNITION_KINDS = ("lindeps", "algdeps", "in_field", "certificates", "lindeps_support")
INDEX_COLUMNS = ["label", "Dco", "Dcy", "i", "j", "parity", "v", "prec", "label_co", "label_cy",
                 "cert", "cert_degree", "lindep", "primes", "field", "algdep_match",
                 "in_field", "in_field_power", "algdep", "algdep_degree", "support", "field_src"]


# PROVENANCE

def git_state(path: Path) -> dict:
    def run(*args):
        try:
            return subprocess.run(["git", "-C", str(path), *args], capture_output=True, text=True, timeout=30,
                                  check=True).stdout.strip()
        except Exception:
            return None
    return {"path": str(path), "commit": run("rev-parse", "HEAD"), "branch": run("rev-parse", "--abbrev-ref", "HEAD"),
            "dirty": bool(run("status", "--porcelain", "--untracked-files=no"))}


def sha256(path: Path) -> str:
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def provenance(args) -> dict:
    return {
        "exported": datetime.datetime.now().isoformat(timespec="seconds"),
        "host": platform.node(),
        "arguments": vars(args),
        "datasets": git_state(DATASETS),
        "datasets_versions": (DATASETS / "VERSIONS.txt").read_text(),
        "code": {name: git_state(DARMONVONK / name) for name in ("level-computations-dev", "darmonpoints-dev", "dvk-database")},
        "schema_version": SCHEMA_VERSION,
    }


# EMBEDDING LABELS (investigation (j))

def embedding_labels(level: str, discs: list[int], D: int, N: int) -> dict:
    """``{disc: [label of embedding 0, 1, ...]}`` from (j), after checking that the stored embeddings it was computed
    from are the current ones (same entries ``EMB_<D>_<N>_<disc>`` in Precomputed_data/embeddings.json)."""
    data = json.loads(LABELS_JSON.read_text())
    table = data["summary"].get(level)
    if table is None:
        return {"available": False, "reason": f"no labels for {level} in {LABELS_JSON}"}
    recorded = data["metadata"]["precomputed"]["sha256"]["embeddings.json"]
    current_path = DATASETS / "Precomputed_data/embeddings.json"
    current = json.loads(current_path.read_text())
    check = {"labels_file": str(LABELS_JSON), "labels_sha256": sha256(LABELS_JSON), "embeddings_sha256_recorded": recorded,
             "embeddings_sha256_current": sha256(current_path)}
    if recorded != check["embeddings_sha256_current"]:
        # find the recorded version in the history of the datasets repository and compare the entries used
        log = subprocess.run(["git", "-C", str(DATASETS), "log", "--format=%H", "--", "Precomputed_data/embeddings.json"],
                             capture_output=True, text=True, check=True).stdout.split()
        old = None
        for commit in log:
            blob = subprocess.run(["git", "-C", str(DATASETS), "show", f"{commit}:Precomputed_data/embeddings.json"],
                                  capture_output=True, check=True).stdout
            if hashlib.sha256(blob).hexdigest() == recorded:
                old, check["embeddings_recorded_commit"] = json.loads(blob), commit
                break
        if old is None:
            raise RuntimeError("the embeddings.json version used by the labels is not in the datasets history")
        ids = [dm.embeddings_id(D, N, d) for d in discs]
        differing = [e for e in ids if old.get(e) != current.get(e)]
        if differing:
            raise RuntimeError(f"embeddings changed since the labels were computed: {differing}")
        check["entries_compared"] = ids
        check["entries_unchanged"] = True
    labels = {}
    for d in discs:
        entry = table.get(str(d))
        if entry is None:
            raise RuntimeError(f"no labels for discriminant {d} of {level}")
        labels[d] = [[[int(q) for q in S], int(c)] for S, c in entry["labels"]]
    return {"available": True, "labels": labels, "check": check,
            "convention": "(S, c): S the primes of disc(B)N at which the orientation differs from embedding 0, "
                          "c the position in bqf_ncgp_lexic(D) of the narrow class taking w_S . emb_0 to emb_i "
                          "(Rickards, Thm 4.5.4; level_computations/embedding_labels.py)"}


def label_string(label) -> str | None:
    if label is None:
        return None
    S, c = label
    return f"({{{','.join(map(str, S))}}}, {c})" if S else f"(∅, {c})"


# RECORDS

def plain_key(key):
    """A stored product key ((cycle embs), (inversions)) as a tuple of tuples of ints."""
    return tuple(tuple(int(a) for a in part) for part in key)


def load_recognition(kind: str, level: str, Dco: int, Dcy: int, emb: int, parity: str, precision: int, sources: dict):
    path = DATASETS / kind / level / f"{Dco}_{Dcy}" / str(emb) / f"1_{parity[-1]}_{precision}.sobj"
    if not path.exists():
        return None, None
    raw = load(str(path))
    sources[str(path.relative_to(DATASETS))] = sha256(path)
    generic = raw.pop("generic_data", None)
    return raw, {"file": str(path.relative_to(DATASETS)), "generic_data": encode.jsonable(generic)}


def lindep_record(value, checks: dict, match, cert: dict | None, method: str = "lindep") -> dict | None:
    """The stored lindep tuple (``method`` "lindep" for the staged lindep, "lindep_support" for the support lindep),
    its field checks and algdep match, and the root of ``ff`` certified by the certificate comparison (``"J'"``,
    ``"J"``, ``"p^(v/r) J'"``; ``None`` with ``error`` when ff vanishes at none)."""
    if value is None:
        return None
    ff, remainder, d, relation, ffsmall = value
    check = checks.get(str(ffsmall))
    lc = [c for c in (cert or {}).get("certificates", []) if c.get("method") == method]
    return {"ff": encode.poly(ff), "ffsmall": encode.poly(ffsmall), "remainder": int(remainder), "d": int(d),
            "relation": [[ell if ell == "J" else int(ell), int(c)] for ell, c in relation],
            "primes": sorted({int(ell) for ell, c in relation if ell != "J" and int(c) != 0}),
            "field": check, "algdep_match": match,
            "root": lc[0].get("root") if lc else None, "error": lc[0].get("error") if lc else None}


def lindep_state(present: bool, lin: dict | None) -> str | None:
    """Index value: ``ok`` (relation found, ff certified at J' or J), ``unverified`` (no certified root),
    ``none`` (no relation), ``None`` (no lindep file)."""
    if not present:
        return None
    if lin is None:
        return "none"
    return "ok" if lin.get("root") and not lin.get("error") else "unverified"


def field_tier(check: dict | None) -> str | None:
    if check is None:
        return None
    if any(check.get(k) is None for k in ("trivial", "in_H", "generating")):
        return "undecided"
    if check["trivial"]:
        return "trivial"
    if check["generating"]:
        return "generating"
    return "in_H" if check["in_H"] else "outside_H"


def algdep_record(raw: dict | None, point, twist: dict, status: str | None, J_encoded: dict) -> dict | None:
    if raw is None:
        return None
    degrees = {}
    for key, value in raw.items():
        pt, degree = plain_key(key[0]), int(key[1])
        if pt != point:
            continue
        if value is None:
            degrees[str(degree)] = None
            continue
        z, ff, ffsmall, i, n, tolerance = value
        tw = twist.get(((point[0], point[1]), degree)) or twist.get((key[0], key[1]))
        z_encoded = encode.padic(z)
        degrees[str(degree)] = {"z": "J" if z_encoded == J_encoded else z_encoded, "ff": encode.poly(ff), "ffsmall": encode.poly(ffsmall),
                                "i": int(i), "n": int(n), "tolerance": float(tolerance),
                                "twist": encode.jsonable(tw) if tw is not None else None}
    return {"status": status, "degrees": dict(sorted(degrees.items(), key=lambda t: int(t[0])))}


def certificate_degree(cert: dict | None) -> int | None:
    if not cert:
        return None
    degrees = {c.get("degree") for c in cert.get("certificates", []) if c.get("counts")}
    return degrees.pop() if len(degrees) == 1 else None


def _root_text(record: dict, p: int) -> str | None:
    return {"J'": f"J/{p}^v(J)", "J": "J"}.get(record.get("root"))


def sage_line(field: dict, J: dict, label: str, H: str | None, lindep: dict | None, header: str,
              support: dict | None = None) -> str:
    parts = [encode.sage_field_line(field), f"J = {encode.sage_padic_expr(J, field['p'])}"]
    if H:
        parts.append(f"H.<h> = NumberField({H})")
    comment = f"  # {label}, {header}"
    if lindep is not None:
        parts.append(f"f = {lindep['ff']}")
        root = _root_text(lindep, field["p"])
        comment += f"; lindep: f({root}) = 0" if root else "; lindep polynomial f (not certified at J, see the certificate)"
    if support is not None:
        parts.append(f"f_support = {support['ff']}")
        root = _root_text(support, field["p"])
        comment += f"; support lindep: f_support({root}) = 0" if root else "; support lindep polynomial f_support (not certified)"
    return "; ".join(parts) + comment


def session_manifest(level: str, precision: int, session: str, sources: dict) -> dict:
    """Run metadata of a J values session from its manifest (``datasets/manifests/level_<level>_<prec>_<session>``):
    the Hecke killer, Magma version, host, start and code commits."""
    path = DATASETS / "manifests" / f"level_{level}_{precision}_{session}.manifest.json"
    if not path.exists():
        return {"manifest": None}
    sources[str(path.relative_to(DATASETS))] = sha256(path)
    m = json.loads(path.read_text())
    killer = m.get("killer")
    return {"manifest": str(path.relative_to(DATASETS)), "killer": killer, "magma_version": m.get("magma_version"),
            "hostname": m.get("hostname"), "start": m.get("start"),
            "code": {k: {"commit": v.get("commit"), "branch": v.get("branch"), "dirty": v.get("dirty")}
                     for k, v in (m.get("code") or {}).items() if isinstance(v, dict) and "commit" in v}}


# EXPORT

def export_level(args) -> dict:
    t_start = time.time()
    p, D, N = map(int, args.level.split("_"))
    out = Path(args.out)
    prov = provenance(args)
    sources: dict[str, str] = {}

    # J values at the pinned precision: one session per cocycle discriminant
    root = DATASETS / "J_values/db" / args.level
    sessions: dict[int, set] = {}
    for f in root.glob(f"*/*/*_{args.precision}_*.sobj"):
        m = re.fullmatch(r"\d+_\d+_(\d{6}_\d{6})\.sobj", f.name)
        sessions.setdefault(int(f.parent.parent.name), set()).add(m.group(1))
    ambiguous = {Dco: s for Dco, s in sessions.items() if len(s) != 1}
    if ambiguous:
        raise RuntimeError(f"several sessions at P{args.precision}: {ambiguous}; pin one")
    dbs = {Dco: JValuesDB(p, D, N, Dco, args.precision, s.pop()) for Dco, s in sorted(sessions.items())}
    for db in dbs.values():
        for f in db.files:
            sources[str(Path(f).relative_to(DATASETS))] = sha256(f)
    discs = sorted({k[2] for db in dbs.values() for k in db.data} | set(dbs))
    pairs = sorted({(k[0], k[2]) for db in dbs.values() for k in db.data})
    if args.pairs:
        wanted = {tuple(map(int, s.split("_"))) for s in args.pairs}
        pairs = [pr for pr in pairs if pr in wanted]
    labels = embedding_labels(args.level, discs, D, N)
    label_of = (lambda d, e: labels["labels"][d][e]) if labels["available"] else (lambda d, e: None)

    runs = {Dco: session_manifest(args.level, args.precision, db.session_id, sources) for Dco, db in dbs.items()}
    rows = []
    fields_seen = []
    pair_summaries = []
    timings = {}
    (out / "jvalues" / args.level / "pairs").mkdir(parents=True, exist_ok=True)
    for Dco, Dcy in pairs:
        t_pair = time.time()
        db = dbs[Dco]
        idents = sorted(k for k in db.data if k[2] == Dcy)
        cocycle_embs = sorted({k[1] for k in idents})
        H_computed = str(dvkw.conjectural_field_poly(Dco, Dcy))
        identifiers = {}
        points = []
        H_stored = set()
        files = {}
        field = None
        for i in cocycle_embs:
            ldb = adb = None
            try:
                ldb = lindepDB(p, D, N, Dco, Dcy, i, precision=args.precision)
            except FileNotFoundError:  # no lindep folder for this pair (e.g. 3_14_5 104_140): no lindep file
                pass
            try:
                adb = algdepDB(p, D, N, Dco, Dcy, i, precision=args.precision)
            except FileNotFoundError:
                pass
            for handler in (ldb, adb):
                if handler is None:
                    continue
                wrong = {k: v for k, v in handler.loaded_precision.items() if k[0] == 1 and v != args.precision}
                if wrong:
                    raise RuntimeError(f"{handler!r} loaded precisions {wrong}")
            checks = ldb.field_checks if ldb else {}
            matches = ldb.algdep_matches(adb) if ldb else {}
            twist = adb.twist_data if adb else {}
            loaded = {parity: {kind: load_recognition(kind, args.level, Dco, Dcy, i, parity, args.precision, sources)
                               for kind in RECOGNITION_KINDS} for parity in PARITIES}
            support_polys = [v[4] for parity in PARITIES for v in (loaded[parity]["lindeps_support"][0] or {}).values()
                             if v is not None]
            support_checks = compute_field_checks(support_polys, Dco, Dcy) if support_polys else {}
            for parity in PARITIES:
                recs = {kind: loaded[parity][kind][0] for kind in RECOGNITION_KINDS}
                metas = {kind: loaded[parity][kind][1] for kind in RECOGNITION_KINDS}
                files[f"{i}.{parity}"] = metas
                for kind in ("lindeps", "in_field"):
                    gd = (metas[kind] or {}).get("generic_data") or {}
                    if gd.get("conjectural_field"):
                        H_stored.add(gd["conjectural_field"])
                ps_par = (1, parity[-1])
                status = adb.point_status(*ps_par) if adb is not None and ps_par in adb.data else {}
                for ident in [k for k in idents if k[1] == i]:
                    j = ident[3]
                    point = ((j,), (0,))
                    J = db.J(ident)[parity]
                    if field is None:
                        field = encode.padic_field(J.parent())
                    elif encode.padic_field(J.parent()) != field:
                        raise RuntimeError(f"p-adic field of {ident} differs from {field}")
                    if f"{i}.{j}" not in identifiers:
                        ev = db.get_evaluation_data(ident)
                        identifiers[f"{i}.{j}"] = {
                            "Jeven": encode.padic(ev["Jeven"]), "Jodd": encode.padic(ev["Jodd"]), "J0": encode.padic(ev["J0"]),
                            "factor": int(ev["factor"]), "cycle_scaling": int(ev.get("cycle_scaling", 1)),
                            "stored_scaling": int(db._stored_scaling(ident)),
                            "hecke_operator": encode.jsonable(ev.get("hecke_operator")),
                            "file": str(Path(db.file_path(p, D, N, Dco, Dcy, i, args.precision, db.session_id)).relative_to(DATASETS)),
                        }
                    by_key = {kind: {plain_key(k): v for k, v in (recs[kind] or {}).items()}
                              for kind in ("lindeps", "in_field", "certificates", "lindeps_support")}
                    cert = encode.jsonable(by_key["certificates"].get(point)) if recs["certificates"] is not None else None
                    lin = lindep_record(by_key["lindeps"].get(point), checks,
                                        matches.get(ps_par, {}).get(next((k for k in (ldb.data.get(ps_par, {}) if ldb else {})
                                                                          if plain_key(k) == point), None)),
                                        cert)
                    sup = lindep_record(by_key["lindeps_support"].get(point), support_checks, None, cert,
                                        method="lindep_support")
                    Jenc = encode.padic(J)
                    alg = algdep_record(recs["algdeps"], point,
                                        {(plain_key(k[0]), k[1]): v for k, v in twist.get(ps_par, {}).items()},
                                        next((v for k, v in status.items() if plain_key(k) == point), None), Jenc)
                    inf = encode.jsonable(by_key["in_field"].get(point)) if recs["in_field"] is not None else None
                    label = f"{p}.{D}.{N}-{Dco}.{Dcy}-{i}.{j}-{parity}"
                    H = next(iter(H_stored)) if len(H_stored) == 1 else H_computed
                    rec = {"label": label, "Dco": Dco, "Dcy": Dcy, "i": i, "j": j, "parity": parity, "J": Jenc,
                           "lindep": lin, "lindep_support": sup, "algdep": alg, "in_field": inf, "certificate": cert,
                           "sage": sage_line(field, Jenc, label, H, lin, f"p={p} D={D} N={N} P{args.precision}", sup)}
                    points.append(rec)
                    alg_degrees = [int(d) for d, v in (alg or {}).get("degrees", {}).items() if v is not None]
                    # primes and field from the staged lindep, or from the support lindep when there is no staged one
                    rel, rel_src = (lin, "lindep") if lin else ((sup, "support") if sup else (None, None))
                    rows.append([label, Dco, Dcy, i, j, parity, Jenc.get("v"), Jenc["prec"],
                                 label_string(label_of(Dco, i)), label_string(label_of(Dcy, j)),
                                 (cert or {}).get("status"), certificate_degree(cert),
                                 lindep_state(recs["lindeps"] is not None, lin),
                                 ",".join(map(str, rel["primes"])) if rel else None,
                                 field_tier(rel["field"]) if rel else None,
                                 lin["algdep_match"] if lin else None,
                                 None if recs["in_field"] is None else bool(inf and inf.get("confirmed")),
                                 encode.jsonable(inf.get("power")) if inf else None,
                                 (alg or {}).get("status"), min(alg_degrees) if alg_degrees else None,
                                 lindep_state(recs["lindeps_support"] is not None, sup), rel_src])
        if len(H_stored) > 1:
            raise RuntimeError(f"several conjectural fields stored for {Dco}_{Dcy}: {H_stored}")
        H = next(iter(H_stored)) if H_stored else H_computed
        pair = {"schema_version": SCHEMA_VERSION, "level": args.level, "p": p, "D": D, "N": N, "Dco": Dco, "Dcy": Dcy,
                "precision": args.precision, "session": db.session_id, "run": runs[Dco], "padic_field": field,
                "H": H, "H_computed": H_computed, "H_agrees": H == H_computed,
                "labels": {"cocycle": {e: label_of(Dco, e) for e in cocycle_embs},
                           "cycle": {j: label_of(Dcy, j) for j in sorted({k[3] for k in idents})}},
                "identifiers": identifiers, "recognition_files": files, "points": points}
        path = out / "jvalues" / args.level / "pairs" / f"{Dco}_{Dcy}.json"
        path.write_text(json.dumps(pair, separators=(",", ":")))
        timings[f"{Dco}_{Dcy}"] = round(time.time() - t_pair, 2)
        if field not in fields_seen:
            fields_seen.append(field)
        pair_summaries.append({"Dco": Dco, "Dcy": Dcy, "n_points": len(points), "H": H, "H_agrees": H == H_computed,
                               "file": str(path.relative_to(out)), "bytes": path.stat().st_size})
        print(f"{Dco}_{Dcy}: {len(points)} points, {path.stat().st_size} bytes, {timings[f'{Dco}_{Dcy}']} s", flush=True)

    index = {"schema_version": SCHEMA_VERSION, "level": args.level, "precision": args.precision,
             "columns": INDEX_COLUMNS, "rows": rows}
    index_path = out / "jvalues" / args.level / "index.json"
    index_path.write_text(json.dumps(index, separators=(",", ":")))

    level_entry = {"p": p, "D": D, "N": N, "precision": args.precision,
                   "padic_field": fields_seen[0] if len(fields_seen) == 1 else None, "padic_fields": fields_seen,
                   "sessions": {Dco: db.session_id for Dco, db in dbs.items()},
                   "runs": {Dco: runs[Dco] for Dco in dbs},
                   "killers": sorted({json.dumps(r.get("killer"), sort_keys=True) for r in runs.values()}),
                   "precision_reason": args.precision_reason, "discs": discs,
                   "n_points": len(rows), "pairs": pair_summaries, "index": str(index_path.relative_to(out)),
                   "index_bytes": index_path.stat().st_size,
                   "labels": {k: v for k, v in labels.items() if k != "labels"},
                   "provenance": prov}
    catalog_path = out / "catalog.json"
    catalog = json.loads(catalog_path.read_text()) if catalog_path.exists() else None
    if catalog is None or catalog.get("schema_version") != SCHEMA_VERSION:
        catalog = {
            "schema_version": SCHEMA_VERSION, "kinds": {"jvalues": {"title": "J values", "levels": {}}}}
    catalog["kinds"]["jvalues"]["levels"][args.level] = level_entry
    catalog["kinds"]["jvalues"]["levels"] = dict(sorted(catalog["kinds"]["jvalues"]["levels"].items(),
                                                     key=lambda kv: tuple(int(x) for x in kv[0].split("_"))))
    catalog["updated"] = prov["exported"]
    catalog_path.write_text(json.dumps(catalog, indent=1))

    stamp = datetime.datetime.now().strftime("%y%m%d_%H%M%S")
    (out / "manifests").mkdir(exist_ok=True)
    manifest = {"provenance": prov, "sources_sha256": sources, "n_points": len(rows), "pairs": pair_summaries,
                "timings_seconds": {"pairs": timings, "total": round(time.time() - t_start, 2)}}
    manifest_path = out / "manifests" / f"export_{args.level}_{stamp}.json"
    manifest_path.write_text(json.dumps(manifest, indent=1))
    print(f"{len(rows)} points, index {index_path.stat().st_size} bytes, total {time.time() - t_start:.1f} s; "
          f"manifest {manifest_path}", flush=True)
    return manifest


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--level", help="one level (with --precision); default: every level of exporter/levels.json")
    ap.add_argument("--precision", type=int, help="pinned precision of the J values (with --level)")
    ap.add_argument("--out", default=str(REPO / "build/data"))
    ap.add_argument("--pairs", nargs="*", help="only these Dco_Dcy pairs (tests)")
    args = ap.parse_args()
    config = json.loads(LEVELS_CONFIG.read_text())["levels"]
    if args.level:
        if args.precision is None:
            args.precision = config[args.level]["precision"]
        args.precision_reason = config.get(args.level, {}).get("reason")
        export_level(args)
        return
    for level, entry in config.items():
        print(f"== {level} at P{entry['precision']}", flush=True)
        export_level(argparse.Namespace(level=level, precision=entry["precision"], out=args.out, pairs=None,
                                        precision_reason=entry.get("reason")))


if __name__ == "__main__":
    main()
