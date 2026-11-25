# Export format of the public database (schema version 2)

This document describes the JSON files that `exporter/` writes from the datasets (`gmx-points-dataset`) and that
the static site reads. The files depend neither on Sage nor on the library: every number is stored exactly, and the
Sage snippets rebuild the values in a fresh Sage session. Version 2 covers the **single J values (PS = 1)** of every
level, with their recognitions, and the precomputed data (quaternion algebras, orders, candidates, embeddings) with the
stored arithmetic groups.

**Changes from version 1** (2026-11-25):
- all levels, each at the precision pinned in `exporter/levels.json`;
- the p-adic field is recorded per pair (`padic_field`); the level entry has `padic_fields`;
- pair files carry `run` (killer, manifest), and points carry `lindep_support`; the Sage line can define `f_support`;
- two new index columns, `support` and `field_src`; the `primes` and `field` columns fall back to the support lindep;
- `precomputed/tree.json` and `arith_groups/` are new.

## Layout

```
data/
  catalog.json                              data kinds, levels and the provenance of their latest export
  jvalues/<p_D_N>/index.json                one row of short fields per point (used for filtering)
  jvalues/<p_D_N>/pairs/<Dco>_<Dcy>.json    the full records of one (Dco, Dcy) pair
  manifests/export_<p_D_N>_<stamp>.json     provenance, sha256 of every input file, counts and timings of a run
  precomputed/tree.json                     algebras -> orders -> (Fuchsian group, candidates, embeddings)
  arith_groups/<fuchsian|sarith>/<id>/<grouptype>.json.gz   the stored groups, unchanged (darmonpoints arithgroup_io)
```

The pinned precision of each level is in `exporter/levels.json` (under git), with the reason for the choice.

The site loads `catalog.json`, then the index of the levels selected. It loads a pair file only to show a point.

## Points and labels

A **point** is one J value: a cocycle of discriminant `Dco` (stored embedding `i`) evaluated at a cycle of
discriminant `Dcy` (stored embedding `j`), in one of four parities. Its label is

```
p.D.N-Dco.Dcy-i.j-parity        e.g. 5.6.1-8.53-0.3-Je
```

- `p`: the prime;
- `D`, `N`: the discriminant of the quaternion algebra B and the level of the Eichler order;
- `i`, `j`: 0-based positions in the stored embedding lists `EMB_<D>_<N>_<disc>` of `Precomputed_data/embeddings.json`.
  These are the indices of the datasets, and they carry no structure;
- `parity`: one of `Jp`, `Jm`, `Je`, `Jo`.

The point page shows the structured labels `(S, c)` of the two embeddings, from investigation (j):
- `S`: the primes of disc(B)·N at which the orientation of the embedding differs from embedding 0;
- `c`: the position, in `bqf_ncgp_lexic(disc)`, of the narrow class taking `w_S · emb_0` to the embedding (Rickards,
  Thm 4.5.4; `level_computations/embedding_labels.py`).

These are written `(∅, 0)` and `({2,3}, 1)`. The exporter checks that the stored embeddings these labels were
computed from are the current ones.

### Parities

The datasets store, for each pair of embeddings, the multiplicative evaluations `Jeven`, `Jodd` and `J0` (the
evaluation of φ0 at θ0) and the cycle factor. The four parities are (`dvk_wrappers.dvk_J_values_mult`, scaling 1):

| parity | value |
|---|---|
| `Jp` (J+) | Jeven · J0 / Jodd |
| `Jm` (J−) | Jeven · Jodd · J0 |
| `Je` | Jeven · J0 |
| `Jo` | Jodd |

When the stored scaling `s` differs from 1, each value is replaced by an `s`-th root (`our_nroot`). In version 1 every
exported value has `s = 1`, and `tests/check_export.py` checks the formulas on the exported raw values.

## Encodings

- **p-adic numbers.** The values lie in K = Q_p(g) = `Qp(p, cap).extension(f)`, an unramified quadratic extension.
  The `padic_field` entry gives `p`, `cap` and `modulus = f` (exact, in `x`). Here `f` is the minimal polynomial of a
  generator of the maximal order of Q(√Dco₀), where Dco₀ is the first cocycle discriminant of the computation chain
  (`dvk_computation.JComputation._init_padic_field`). For 5_6_1, `f = x^2 - 2`. It is not Sage's default modulus for
  `Qq(25)`.

  A value is stored as

  ```json
  {"v": v, "prec": N, "u": ["u_0", "u_1"]}
  ```

  This means J = p^v (u_0 + u_1 g) + O(p^N). The u_i are integers in [0, p^(N−v)), written in decimal, and
  u_0 + u_1 g is a unit. Zero is `{"zero": true, "prec": N}`.
- **Polynomials** over Q are strings in `x`, in Sage syntax.
- **Rationals and integers** are JSON integers when |n| < 2^53, and strings (`"a/b"`) otherwise.

## `index.json`

```json
{"schema_version": 1, "level": "5_6_1", "precision": 700, "columns": [...], "rows": [[...], ...]}
```

| column | meaning |
|---|---|
| `label` | the point label |
| `Dco`, `Dcy`, `i`, `j`, `parity` | as above |
| `v`, `prec` | p-adic valuation and absolute precision of J |
| `label_co`, `label_cy` | `(S, c)` labels of the cocycle and cycle embeddings |
| `cert` | status of the certificate comparison: `agree` (all counted methods give the same canonical polynomial), `conflict`, …; `null` if there is no certificate file |
| `cert_degree` | degree of the canonical polynomial when the counted certificates share one degree |
| `lindep` | `ok`: a relation was found and `ff` vanishes at J/p^v(J) or at J (root certified by the certificate comparison); `unverified`: a relation was found but `ff` vanishes at no candidate root; `none`: no relation; `null`: no lindep file |
| `field_src` | which relation `primes` and `field` come from: `lindep` (the staged lindep), `support` (the support lindep, used when there is no staged lindep relation, as at 7.6.5), `null` |
| `support` | support lindep state, as `lindep` (only 7.6.5 has support lindeps) |
| `primes` | the primes ℓ in the lindep relation, comma-separated. An empty string means J is a unit up to p and roots of unity |
| `field` | field generated by the root of the lindep `ff` (J or J′, **not** J^r), from the db_handlers field checks of `ffsmall`: `trivial`, `generating` (generates H), `in_H` (non-trivial, in H, not generating), `outside_H` (not in H), `undecided` (a check timed out) |
| `algdep_match` | whether the lindep field is isomorphic to the field of the smallest-degree successful algdep (`"absent"`: no successful algdep) |
| `in_field`, `in_field_power` | in-field recognition accepted (held-out check) and the power e with iota(x) = (J ζ)^e |
| `algdep`, `algdep_degree` | algdep point status (`none`, `returned`, `success`) and the smallest degree with a result |

## Pair files

```json
{
  "schema_version": 1, "level": "5_6_1", "p": 5, "D": 6, "N": 1, "Dco": 8, "Dcy": 53,
  "precision": 700, "session": "121126_205448",
  "run": {"manifest": "manifests/level_5_6_1_700_121126_205448.manifest.json", "killer": null,
          "magma_version": "2 27 7", "start": "...", "code": {...}},
  "padic_field": {"p": 5, "cap": 700, "modulus": "x^2 - 2", "gen": "g"},
  "H": "x^4 - 122*x^2 + 2025",
  "H_computed": "...", "H_agrees": true,
  "labels": {"cocycle": {"0": [[], 0], ...}, "cycle": {...}},
  "identifiers": {"<i>.<j>": {...}},
  "recognition_files": {"<i>.<parity>": {...}},
  "points": [...]
}
```

- `H` is the conjectural field recorded by the recognitions: the compositum of the narrow (ring) class fields of
  Dco and Dcy. `H_computed` is the same field recomputed by `dvk_wrappers.conjectural_field_poly` at export time.
- `identifiers` holds the stored raw data of each pair of embeddings:
  - `Jeven`, `Jodd`, `J0` (p-adic);
  - `factor` (the stored values are those of factor × the cycle) and `cycle_scaling`;
  - `stored_scaling`, `hecke_operator`;
  - the source `file`.
- `run` is read from the manifest of the J values session (the public build drops host names and makes paths
  relative, `scripts/build_site.py`). `killer` is the Hecke operator applied to the cycle and
  the cocycle (`null` at level 1; otherwise `{type, name, terms, eisenstein, height, source}`, see
  `level_computations/hecke_killers.py`).
- `recognition_files` gives, per cocycle embedding and parity, the source file and its generic data, for
  `lindeps`, `algdeps`, `in_field`, `certificates` and `lindeps_support`. The generic data include the method, the code commit, the
  timings and the field used.

### A point

| field | content |
|---|---|
| `label`, `Dco`, `Dcy`, `i`, `j`, `parity` | identification |
| `J` | the p-adic value |
| `lindep` | `null`, or the stored tuple `(ff, remainder, d, relation, ffsmall)`; see below |
| `algdep` | `{"status", "degrees": {"<d>": null \| {...}}}`; see below |
| `in_field` | the stored in-field certificate; see below |
| `certificate` | the comparison of the certificates; see below |
| `sage` | a one-line Sage snippet; see below |

- **`lindep`**: `null`, or the stored tuple `(ff, remainder, d, relation, ffsmall)`:
  - `ff`: irreducible. It vanishes at the root recorded in `root`:
    - `"J'"` = J / p^v(J), always the case when v(J) = 0;
    - `"J"`, the value itself;
    - `"p^(v/r) J'"`, which only occurs in files written before d81fc5c.

    The root is read from the certificate comparison (`certificates.from_lindep`). `root = null` together with
    `error` means that `ff` vanishes at none of them; the comparison does not count such a lindep. At 5_6_1, P700,
    944 points have `J'`, 492 have `J` (exactly those with v ≠ 0) and 4 have neither.
  - `relation`: the lindep relation as `[["J", r], [ℓ, c], …]`, in the stored order. That is,
    r log J + Σ c log g + (units) = 0 in H, with one generator g per **prime ideal** above ℓ. Repeated ℓ are
    different ideals; the order is that of the library, so do not sort the list.
  - `primes`: the primes ℓ with c ≠ 0.
  - `remainder`, `d`: the remainder and the order of the root of unity adjusting J^r (`d = 0` when none was found).
  - `ffsmall`: the `polredbest` polynomial of the same field. It defines the field but does not vanish at J.
  - `field`: the field checks `{trivial, in_H, generating}` of `ffsmall`. `null` marks a check that timed out.
  - `algdep_match`: as in the index.
- **`algdep`**: `{"status", "degrees": {"<d>": null | {...}}}`, one entry per degree tried. A result holds:
  - `z`, with ff(z) = 0 and z^pw = J · ζ. It is written `"J"` when z = J.
  - `ff` and `ffsmall`;
  - `i` and `n`: the index i of ζ in `our_nroot(1, n, return_all=True)`. This list is not ordered by powers.
  - `tolerance`;
  - `twist`: the actual root power `pw`, the order of ζ, and the de-rooted polynomials (`algdep_db.twist_data`).
- **`in_field`**: the stored in-field certificate (`level_computations/recognition/in_field.py`):
  - x = beta / gamma in L = NumberField(H). The coordinates of x, beta and gamma are in the **power basis** of the
    generator: `L(list(x))` (`in_field.certificate_element`);
  - iota(x) = (J · ζ_i)^e, with `power` e, `zeta_index` i, and `embedding_index` the root of the defining polynomial
    of L in K;
  - `form`: `quotient`, or `involution` (norm-one values, beta / s(beta));
  - `N` and `held`: the digits used and held out; `confirmed`: the held-out check.
- **`certificate`**: the comparison of the certificates (`recognition/certificates.py`). Every method is reduced to
  the minimal polynomial of the canonical value T = (J / p^v(J))^M, with M = lcm(12, p² − 1).
  - `groups`: the methods, grouped by the fingerprint of that polynomial;
  - `status`: `agree` when all the certificates that count fall in one group;
  - `certificates[k]`: per method, the degree, the digits cancelled at T, and whether it is confirmed and counted.
- **`lindep_support`**: as `lindep`, for the support lindep (the lindep on the support of the in-field element,
  `JValuesCore.save_cycle_support_lindeps`); its root is read from the certificate of method `lindep_support`, and
  `algdep_match` is `null`. Only 7.6.5 has support lindeps.
- **`sage`**: one line that defines `x`, `K`, `g` and `J`, then `H` (`h` its generator), then `f` = the lindep `ff`
  when there is one, and `f_support` = the support lindep `ff` when there is one. A comment ends the line with the label and the root at which `f` vanishes. `tests/check_export.py` runs every line and checks that
  the result equals the stored value exactly.

## `catalog.json`

```
{"schema_version", "updated",
 "kinds": {"jvalues": {"title", "levels": {"<p_D_N>": {
   p, D, N, precision, precision_reason, padic_field (null if it varies), padic_fields,
   sessions: {Dco: session}, runs: {Dco: run}, killers: [JSON strings], discs, n_points,
   pairs: [{Dco, Dcy, n_points, H, H_agrees, file, bytes}],
   index, index_bytes,
   labels: {available, check, convention},
   provenance}}}}}
```

`provenance` holds:
- the export time and host, and the arguments;
- the datasets commit and whether the tree was dirty, and `VERSIONS.txt`;
- the commits of level-computations-dev, darmonpoints-dev and dvk-database.

The manifest of each run adds the sha256 of every input file.

## `precomputed/tree.json`

```
{"schema_version": 1, "exported", "datasets": {commit, dirty}, "dvk_database", "sources_sha256", "conventions",
 "algebras": [{id: "QA_6", disc, abtuple: [a, b], primes, maxord,
   orders: [{id: "EO_6_1", level, basis,
     fuchsian: [group summary],
     candidates: [{id: "C_5_6_1", level, p, bound, admissible_disc, hecke_data, sarith: [group summary], jvalues_exported}],
     embeddings: [{id: "EMB_6_1_8", disc, num_emb, embeddings: [quaternion strings], labels: [[S, c], ...] | null}]}]}]}
```

- Quaternions and bases are as stored in `Precomputed_data`: coordinates in 1, i, j, k, with i² = a, j² = b.
- A group summary holds `file` (the copy under `arith_groups/`), `kind`, `grouptype`, `created`,
  `darmonpoints_commit`, `magma_version`, `sha256` and `bytes_gz`. A Fuchsian group adds `n_generators`,
  `relation_words`, `abelian_invariants`, `relation_matrix` and `fundamental_domain_vertices`. An S-arithmetic group
  adds `p`, `Gn_file`, `Gpn_file` and `wp`.
- `labels` are the (S, c) labels of investigation (j). They exist only for the discriminants of 5.6.1 and 3.10.1.

## What version 2 leaves out

- products of several values (PS > 1);
- values at other precisions;
- the rising cycle discriminants (P100, investigation (z));
- the Hecke-translated values;
- the (S, c) labels at levels N > 1 (investigation (j) has them only on an unmerged branch).
