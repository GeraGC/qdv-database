"""Export Precomputed_data and the arith_groups store as one tree for the site (phase 3). Plain Python, no Sage.

Tree: quaternion algebra (QA_D) -> Eichler orders (EO_D_N) -> {Fuchsian group of the order, candidates C_p_D_N with
their S-arithmetic group, optimal embeddings EMB_D_N_disc with their (S, c) labels when investigation (j) has them}.

Output under ``--out`` (default build/data):

    precomputed/tree.json                 the tree with summaries of the stored groups
    arith_groups/<path>.json.gz           the stored groups, copied unchanged (exact data, darmonpoints/arithgroup_io.py)

Usage: python3 exporter/export_precomputed.py [--out build/data]
"""

import argparse
import datetime
import gzip
import hashlib
import json
import re
import shutil
import subprocess
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
DARMONVONK = Path.home() / "DarmonVonk"
DATASETS = DARMONVONK / "datasets"
LABELS_JSON = DARMONVONK / "investigations/j_shimura_reciprocity/results/labels.json"
SCHEMA_VERSION = 1


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(path, *args):
    try:
        return subprocess.run(["git", "-C", str(path), *args], capture_output=True, text=True, check=True,
                              timeout=30).stdout.strip()
    except Exception:
        return None


def group_summary(path: Path, rel: str) -> dict:
    """Short description of a stored group file (the full file is published next to the tree)."""
    g = json.loads(gzip.open(path).read())
    header = g.get("header", {})
    summary = {"file": f"arith_groups/{rel}", "kind": g.get("kind"), "grouptype": g.get("grouptype"),
               "schema_version": g.get("schema_version"), "created": header.get("created"),
               "darmonpoints_commit": header.get("darmonpoints_commit"), "magma_version": header.get("magma_version"),
               "sage_version": header.get("sage_version"), "bytes_gz": path.stat().st_size, "sha256": sha256(path)}
    if g.get("kind", "").startswith("fuchsian"):
        checks = g.get("checks", {})
        summary.update({"n_generators": g.get("ngquats"), "relation_words": g.get("relation_words"),
                        "abelian_invariants": checks.get("abelian_invariants"),
                        "relation_matrix": checks.get("relation_matrix"),
                        "fundamental_domain_vertices": len(g.get("fundamental_domain") or []),
                        "order_discriminant": g.get("order_discriminant")})
    else:
        summary.update({"p": g.get("p"), "Gn_file": (g.get("files") or {}).get("Gn"),
                        "Gpn_file": (g.get("files") or {}).get("Gpn"), "wp": (g.get("checks") or {}).get("wp")})
    return summary


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(REPO / "build/data"))
    args = ap.parse_args()
    out = Path(args.out)
    pre = DATASETS / "Precomputed_data"
    data = {name: json.loads((pre / f"{name}.json").read_text())
            for name in ("quaternion_algebras", "eichler_orders", "candidates", "embeddings")}
    sources = {f"Precomputed_data/{n}.json": sha256(pre / f"{n}.json") for n in data}

    # stored groups: copy, summarize
    groups = {}
    store = DATASETS / "arith_groups"
    for path in sorted(store.glob("*/*/*.json.gz")):
        rel = str(path.relative_to(store))
        target = out / "arith_groups" / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, target)
        sources[f"arith_groups/{rel}"] = sha256(path)
        groups[rel] = group_summary(path, rel)

    # (S, c) labels of investigation (j) (only for the levels it covers); valid for the current embeddings when the
    # entries it was computed from are unchanged (the J values exporter checks this through the datasets history)
    labels = json.loads(LABELS_JSON.read_text())["summary"] if LABELS_JSON.exists() else {}
    jcatalog = out / "catalog.json"
    exported_levels = set(json.loads(jcatalog.read_text())["kinds"]["jvalues"]["levels"]) if jcatalog.exists() else set()

    algebras = []
    for qa_id, qa in sorted(data["quaternion_algebras"].items(), key=lambda kv: kv[1]["disc"]):
        D = qa["disc"]
        orders = []
        for eo_id, eo in sorted(data["eichler_orders"].items(), key=lambda kv: kv[1]["level"]):
            if eo["QA_id"] != qa_id:
                continue
            N = eo["level"]
            fuchsian = [groups[r] for r in groups if r.startswith(f"fuchsian/{eo_id}/")]
            cands = []
            for c_id, c in sorted(data["candidates"].items(), key=lambda kv: kv[1]["p"]):
                if c["disc"] != D or c["level"] != N:
                    continue
                level = f"{c['p']}_{D}_{N}"
                cands.append({"id": c_id, "level": level, "p": c["p"], "bound": c.get("bound"),
                              "admissible_disc": c.get("admissible_disc"), "hecke_data": c.get("hecke_data"),
                              "sarith": [groups[r] for r in groups if r.startswith(f"sarith/{level}/")],
                              "jvalues_exported": level in exported_levels})
            embs = []
            for e_id, e in data["embeddings"].items():
                if e.get("EO_id") != eo_id:
                    continue
                disc = int(e_id.split("_")[-1])
                lab = None
                for lvl, table in labels.items():
                    l_p, l_D, l_N = map(int, lvl.split("_"))
                    if (l_D, l_N) == (D, N) and str(disc) in table:
                        lab = [[[int(q) for q in S], int(cl)] for S, cl in table[str(disc)]["labels"]]
                embs.append({"id": e_id, "disc": disc, "num_emb": e["num_emb"], "embeddings": e["embeddings"],
                             "labels": lab})
            embs.sort(key=lambda x: x["disc"])
            orders.append({"id": eo_id, "level": N, "basis": eo["basis"], "fuchsian": fuchsian, "candidates": cands,
                           "embeddings": embs})
        algebras.append({"id": qa_id, "disc": D, "abtuple": qa["abtuple"], "primes": qa["primes"],
                         "maxord": qa["maxord"], "orders": orders})

    tree = {"schema_version": SCHEMA_VERSION, "exported": datetime.datetime.now().isoformat(timespec="seconds"),
            "datasets": {"commit": git(DATASETS, "rev-parse", "HEAD"),
                         "dirty": bool(git(DATASETS, "status", "--porcelain", "--untracked-files=no"))},
            "dvk_database": git(REPO, "rev-parse", "HEAD"), "sources_sha256": sources,
            "conventions": {"quaternion": "coordinates in the basis 1, i, j, k of B = (a, b)_Q with i^2 = a, j^2 = b "
                                          "(abtuple = [a, b]); bases and embeddings as stored by level-computations",
                            "labels": "(S, c) labels of the embeddings from investigation (j) where available"},
            "algebras": algebras}
    (out / "precomputed").mkdir(parents=True, exist_ok=True)
    path = out / "precomputed/tree.json"
    path.write_text(json.dumps(tree, separators=(",", ":")))
    n = lambda key: sum(len(o[key]) for a in algebras for o in a["orders"])  # noqa: E731
    print(f"{len(algebras)} algebras, {sum(len(a['orders']) for a in algebras)} orders, {n('candidates')} candidates, "
          f"{n('embeddings')} embedding lists, {len(groups)} stored groups; {path} {path.stat().st_size} bytes")


if __name__ == "__main__":
    main()
