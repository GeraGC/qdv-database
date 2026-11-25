"""Checks of an exported level against the stored data (phase 1 verification).

For every point of ``build/data/jvalues/<level>``:

1. **snippet round trip**: the Sage snippet, preparsed and executed in a fresh namespace, gives a p-adic number equal
   to the stored value ``JValuesDB.J(ident)[parity]``, with the same valuation and absolute precision; ``H`` is the
   stored conjectural field and ``f`` the stored lindep polynomial;
2. **lindep polynomial**: the number of p-adic digits the exported ``ff`` cancels at its certified root (J / p^v(J)
   or J, ``recognition.certificates.from_lindep``), against the relative precision; the records without a certified
   root must carry the certificate's error;
3. **parities**: the exported raw values satisfy Jp = Jeven J0 / Jodd, Jm = Jeven Jodd J0, Je = Jeven J0,
   Jo = Jodd (``dvk_wrappers.dvk_J_values_mult``) when the stored scaling is 1;
4. **in-field**: x = beta / gamma in L = NumberField(H) (coordinates in the power basis of the generator);
5. **counts**: index rows = points of the pair files, unique labels, and the certificate statuses per file equal the
   ``status_counts`` recorded in the certificate files.

Writes ``results/check_export_<level>.json`` and prints a summary; exit code 1 when a check fails.
Usage (through ../tmux_run.sh): python tests/check_export.py [--level 5_6_1 [--precision 700]]
"""

from __future__ import annotations

import argparse
import collections
import json
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path.home() / "DarmonVonk/level-computations-dev"))
sys.path.insert(0, str(REPO))

from sage.all import QQ, NumberField, PolynomialRing, load, preparse  # noqa: E402

import data_management as dm  # noqa: E402
from db_handlers.jvalues_db import JValuesDB  # noqa: E402
from level_computations.recognition.certificates import cancelled_digits  # noqa: E402

from exporter.encode import sage_padic_expr  # noqa: E402

DATASETS = Path(dm.READ_PATH)
QX = PolynomialRing(QQ, "x")


def run_snippet(code: str) -> dict:
    namespace: dict = {}
    exec("from sage.all import *", namespace)
    exec(preparse(code.split("  # ")[0]), namespace)
    return namespace


def check_level(args) -> dict:
    t0 = time.time()
    p, D, N = map(int, args.level.split("_"))
    base = Path(args.data) / "jvalues" / args.level
    index = json.loads((base / "index.json").read_text())
    catalog = json.loads((Path(args.data) / "catalog.json").read_text())
    sessions = {int(k): v for k, v in catalog["kinds"]["jvalues"]["levels"][args.level]["sessions"].items()}
    dbs = {Dco: JValuesDB(p, D, N, Dco, args.precision, s) for Dco, s in sessions.items()}

    failures = collections.defaultdict(list)
    stats = collections.Counter()
    digits_gap = collections.Counter()
    labels = set()
    n_points = 0
    status_exported = collections.Counter()
    status_recorded = collections.Counter()
    for pair_file in sorted((base / "pairs").glob("*.json")):
        pair = json.loads(pair_file.read_text())
        Dco, Dcy = pair["Dco"], pair["Dcy"]
        db = dbs[Dco]
        H = QX(pair["H"])
        L = NumberField(H, "a")
        # 3: raw values and parities
        for key, ident in pair["identifiers"].items():
            if ident["stored_scaling"] != 1:
                stats["parity_skipped_scaling"] += 1
                continue
            i, j = map(int, key.split("."))
            field_line = pair["points"][0]["sage"].split("; J = ")[0]
            ns = run_snippet(field_line + "; " + "; ".join(
                f"{name} = {sage_padic_expr(ident[name], p)}" for name in ("Jeven", "Jodd", "J0")))
            Je, Jo, J0 = ns["Jeven"], ns["Jodd"], ns["J0"]
            stored = db.J((Dco, i, Dcy, j))
            derived = {"Jp": Je * J0 / Jo, "Jm": Je * Jo * J0, "Je": Je * J0, "Jo": Jo}
            for par, value in derived.items():
                if value != stored[par]:
                    failures["parity_formula"].append(f"{Dco}.{Dcy}-{i}.{j}-{par}")
                stats["parity_checked"] += 1
        # 1, 2, 4
        for pt in pair["points"]:
            n_points += 1
            label = pt["label"]
            if label in labels:
                failures["duplicate_label"].append(label)
            labels.add(label)
            ns = run_snippet(pt["sage"])
            stored = db.J((Dco, pt["i"], Dcy, pt["j"]))[pt["parity"]]
            J = ns["J"]
            if J.parent() is not stored.parent():
                J = stored.parent()(J.polynomial().list()).add_bigoh(J.precision_absolute())
                stats["snippet_other_parent"] += 1
            if not (J == stored and J.valuation() == stored.valuation()
                    and J.precision_absolute() == stored.precision_absolute()):
                failures["snippet_J"].append(label)
            if QX(ns["H"].defining_polynomial()) != H:
                failures["snippet_H"].append(label)
            stats["snippet_checked"] += 1
            for kind, var in (("lindeps", "f"), ("lindeps_support", "f_support")):
                lin = pt["lindep" if kind == "lindeps" else "lindep_support"]
                if (lin is None) != (var not in ns):
                    failures[f"{kind}_snippet_presence"].append(label)
                if lin is not None:
                    raw = load(str(DATASETS / pair["recognition_files"][f"{pt['i']}.{pt['parity']}"][kind]["file"]))
                    stored_ff = next(v for k, v in raw.items() if k != "generic_data"
                                     and tuple(tuple(int(a) for a in part) for part in k) == ((pt["j"],), (0,)))[0]
                    if QX(ns[var]) != QX(stored_ff) or QX(lin["ff"]) != QX(stored_ff):
                        failures[f"{kind}_ff"].append(label)
                    base = {"J'": stored / stored.parent()(p) ** stored.valuation(), "J": stored}.get(lin["root"])
                    if base is None:
                        # no certified root: must be exactly the records the certificate comparison set aside
                        stats[f"{kind}_uncertified_root_{lin['root']}"] += 1
                        if not lin.get("error"):
                            failures[f"{kind}_root_missing_without_error"].append(label)
                    else:
                        digits, prec = cancelled_digits(QX(lin["ff"]), base)
                        digits_gap[f"{kind}:{prec - digits}"] += 1
                        if digits <= prec // 2:
                            failures[f"{kind}_ff_not_vanishing"].append(label)
                        stats[f"{kind}_checked"] += 1
            inf = pt["in_field"]
            if inf is not None and inf.get("x") is not None:
                elt = lambda cs: L([QQ(c) for c in cs])  # noqa: E731  power basis of the generator (in_field.certificate)
                if elt(inf["gamma"]) == 0 or elt(inf["x"]) != elt(inf["beta"]) / elt(inf["gamma"]):
                    failures["in_field_x"].append(label)
                stats["in_field_checked"] += 1
            if pt["certificate"] is not None:
                status_exported[(Dco, Dcy, pt["i"], pt["parity"], pt["certificate"]["status"])] += 1
        # 5: recorded certificate status counts
        for key, metas in pair["recognition_files"].items():
            cert = metas.get("certificates")
            if cert:
                i, parity = key.split(".")
                for status, n in (cert["generic_data"].get("status_counts") or {}).items():
                    status_recorded[(Dco, Dcy, int(i), parity, status)] += n
    if n_points != len(index["rows"]):
        failures["index_rows"].append(f"{len(index['rows'])} rows, {n_points} points")
    if status_exported != status_recorded:
        diff = {str(k): (status_exported[k], status_recorded[k]) for k in set(status_exported) | set(status_recorded)
                if status_exported[k] != status_recorded[k]}
        failures["certificate_status_counts"].append(json.dumps(diff)[:2000])
    result = {"level": args.level, "precision": args.precision, "n_points": n_points, "stats": dict(stats),
              "precision_minus_cancelled_digits": dict(sorted(digits_gap.items())),
              "certificate_status": dict(collections.Counter(k[-1] for k in status_exported.elements())),
              "failures": {k: v[:50] for k, v in failures.items()}, "n_failures": {k: len(v) for k, v in failures.items()},
              "seconds": round(time.time() - t0, 1)}
    (REPO / "results").mkdir(exist_ok=True)
    (REPO / "results" / f"check_export_{args.level}.json").write_text(json.dumps(result, indent=1))
    print(json.dumps({k: v for k, v in result.items() if k != "failures"}, indent=1), flush=True)
    return result


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--level", help="one level (default: every level of the catalog)")
    ap.add_argument("--precision", type=int, help="its precision (default: the catalog's)")
    ap.add_argument("--data", default=str(REPO / "build/data"))
    args = ap.parse_args()
    catalog = json.loads((Path(args.data) / "catalog.json").read_text())
    levels = [args.level] if args.level else list(catalog["kinds"]["jvalues"]["levels"])
    total = 0
    for level in levels:
        precision = args.precision or catalog["kinds"]["jvalues"]["levels"][level]["precision"]
        print(f"== {level} P{precision}", flush=True)
        r = check_level(argparse.Namespace(level=level, precision=precision, data=args.data))
        total += sum(r["n_failures"].values())
    print(f"total failures: {total}")
    return 1 if total else 0


if __name__ == "__main__":
    sys.exit(main())
