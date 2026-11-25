// Explanations of the terms of the site ("knowls", after the LMFDB). Each entry:
//   title, cat (category), short (one paragraph, shown in the popover), body (the full page; optional),
//   see (related ids), source (where the definition comes from), reviewed (false until checked by the authors).
// Math between $...$ is rendered with KaTeX. Bodies are HTML.
// DRAFT (2026-11-25): written from the library documentation; every entry must be reviewed before publication.

export const CATEGORIES = [
  ["setting", "Setting"],
  ["values", "J values"],
  ["methods", "Recognition methods"],
  ["certificates", "Certificates and fields"],
  ["precomputed", "Quaternion algebras and groups"],
  ["usage", "Using the data"],
];

export const KNOWLS = {
  // SETTING
  level: {
    cat: "setting", title: "Level p.D.N",
    short: String.raw`A level is a triple $(p, D, N)$: a prime $p$, the discriminant $D$ of an indefinite quaternion algebra $B$ over $\mathbb{Q}$, and the level $N$ of an Eichler order $\mathcal{O}_N \subset B$ ($N = 1$: a maximal order), with $p \nmid DN$. It is written $p.D.N$, e.g. 5.6.1.`,
    body: String.raw`<p>The computations use the $p$-arithmetic group $\Gamma$ of norm-one units of the $\mathbb{Z}[1/p]$-order $\mathcal{O}_N[1/p]$. It is built from the Fuchsian groups of the Eichler orders of levels $N$ and $Np$ (see <a href="knowl.html?id=sarith_group">S-arithmetic group</a>). The group acts on the $p$-adic upper half plane, and the J values are values of rigid meromorphic cocycles for $\Gamma$.</p>
      <p>Each level has a <a href="knowl.html?id=candidate">candidate</a> entry in the precomputed data: the admissible discriminants, and the Hecke data used when $N > 1$ (see <a href="knowl.html?id=killer">Hecke killer</a>).</p>`,
    see: ["jvalue", "candidate", "quaternion_algebra", "eichler_order"], source: "datasets/Precomputed_data/candidates.json; level-computations-dev/dvk_computation.py",
    reviewed: false,
  },
  discriminants: {
    cat: "setting", title: "Discriminants Dco and Dcy",
    short: String.raw`$D_{co}$ is the discriminant of the real quadratic order whose optimal embeddings define the cocycle; $D_{cy}$ that of the order whose embedding defines the cycle at which it is evaluated. Both are among the admissible discriminants of the level; they need not be fundamental.`,
    body: String.raw`<p>For a non-fundamental discriminant $D = d_K f^2$ the order of conductor $f$ in $K = \mathbb{Q}(\sqrt{d_K})$ is used, and the class field attached to it is the narrow ring class field of conductor $f$.</p>`,
    see: ["embeddings", "H", "candidate"], source: "level-computations-dev/dvk_wrappers.py (conjectural_field_poly)",
    reviewed: false,
  },
  embeddings: {
    cat: "setting", title: "Embeddings i and j",
    short: String.raw`$i$ and $j$ are the positions (from 0) of the cocycle and cycle embeddings in the stored lists $\mathrm{EMB}_{D,N,D_{co}}$ and $\mathrm{EMB}_{D,N,D_{cy}}$ of optimal embeddings of the quadratic orders into $\mathcal{O}_N$, up to conjugation by $\mathcal{O}_N^1$. The positions are those of the computation and carry no structure; the $(S, c)$ labels describe them.`,
    body: String.raw`<p>The lists are the output order of Q-Quadratic's <code>qa_embed</code>, stored in <code>Precomputed_data/embeddings.json</code>. Their length is the number of optimal embeddings up to conjugation.</p>`,
    see: ["sc_label", "optimal_embedding"], source: "level-computations-dev/level_computations/embedding_labels.py",
    reviewed: false,
  },
  sc_label: {
    cat: "setting", title: "(S, c) labels of embeddings",
    short: String.raw`The optimal embeddings of discriminant $\Delta$ into $\mathcal{O}_N$, up to conjugation by norm-one units, form a torsor under (local orientations) $\times\, \mathrm{Cl}^+(\Delta)$. The label $(S, c)$ of embedding $i$ records the primes $S \mid \operatorname{disc}(B) N$ where its orientation differs from embedding 0, and the position $c$ (in <code>bqf_ncgp_lexic</code>) of the narrow class taking $w_S \cdot \mathrm{emb}_0$ to $\mathrm{emb}_i$.`,
    body: String.raw`<p>Written $(\emptyset, 0)$, $(\{2,3\}, 1)$, … The labels come from investigation (j) (Rickards' thesis, §4.4–4.5 and Thm 4.5.4), relative to embedding 0. They are available for the levels 5.6.1 and 3.10.1; for the other levels the column shows “–”.</p>`,
    see: ["embeddings"], source: "investigations/j_shimura_reciprocity/labels.py; level_computations/embedding_labels.py",
    reviewed: false,
  },
  killer: {
    cat: "setting", title: "Hecke killer",
    short: String.raw`When $N > 1$ (and in general when $S_2(\Gamma_0(DN))^{D\text{-new}} \neq 0$), the cycle and the cocycle only make sense after their classes in $\Gamma_n^{ab} \otimes \mathbb{Q}$ and $H^1(\Gamma_n, \mathbb{Q})$ are killed by a Hecke operator $t$. The stored values are those of $t$ applied to the cycle and to the cocycle; the operator is shown for each level and session.`,
    body: String.raw`<p>All exported levels with $N > 1$ use a killer of type B: a linear combination of operators $T_\ell$, $\ell \nmid DNp$, killing both classes. Types A (a polynomial in one $T_\ell$) and C (involving $U_\ell$ or $W_\ell$) were also considered.</p>
      <p>The <i>Eisenstein value</i> $e(t)$ is the eigenvalue of $t$ on the degree part ($\ell + 1$ for $T_\ell$); $t$ multiplies the divisor part by $e(t)$, so $e(t) \neq 0$. The <i>height</i> is a proxy for the growth of the heights of the J values ($h(T_\ell) = \ell + 1$, extended additively over the terms): values under $T_\ell$ are norms of values of conductor $\ell$.</p>`,
    see: ["level", "jvalue"], source: "level_computations/hecke_killers.py; investigations/i_level_feasibility/probe.py (select)",
    reviewed: false,
  },

  // VALUES
  jvalue: {
    cat: "values", title: "J value",
    short: String.raw`The value $J$ of a rigid meromorphic cocycle attached to the embedding $i$ of discriminant $D_{co}$, evaluated at the cycle attached to the embedding $j$ of discriminant $D_{cy}$. It is a $p$-adic number in the unramified quadratic extension $K$ of $\mathbb{Q}_p$, known to a finite precision. Darmon and Vonk conjecture that such values are algebraic, in the field $H$ (see the articles for the precise statements).`,
    body: String.raw`<p>Each value is given in four <a href="knowl.html?id=parity">parities</a>. The page of a value shows its $p$-adic expansion, the stored raw evaluations, the recognitions found by each method and their comparison.</p>`,
    see: ["parity", "padic_field", "H", "certificates", "evidence"], source: "level-computations-dev/db_handlers/jvalues_db.py",
    reviewed: false,
  },
  parity: {
    cat: "values", title: "Parities Jp, Jm, Je, Jo",
    short: String.raw`The datasets store, for each pair of embeddings, the evaluations $J_{\mathrm{even}}$ and $J_{\mathrm{odd}}$ of the even and odd parts of the cocycle at the cycle, and $J_0$, the evaluation of $\varphi_0$ at $\theta_0$. The four parities are $J_+ = J_{\mathrm{even}} J_0 / J_{\mathrm{odd}}$, $J_- = J_{\mathrm{even}} J_{\mathrm{odd}} J_0$, $J_e = J_{\mathrm{even}} J_0$ and $J_o = J_{\mathrm{odd}}$.`,
    body: String.raw`<p>When a scaling $s \neq 1$ is stored, each parity is replaced by an $s$-th root; every exported value has $s = 1$. The formulas are checked on the exported raw values for every point.</p>`,
    see: ["jvalue", "cycle_factor"], source: "level-computations-dev/dvk_wrappers.py (dvk_J_values_mult)",
    reviewed: false,
  },
  cycle_factor: {
    cat: "values", title: "Cycle factor and scaling",
    short: String.raw`The stored values are those of $f$ times the cycle, $f$ the cycle factor (the value of the cycle itself would be an $f$-th root, which is not taken). The scaling is an additional root imposed by the computation; it is 1 for all exported values.`,
    see: ["parity"], source: "db_handlers/jvalues_core.py (cycle_factor)", reviewed: false,
  },
  padic_field: {
    cat: "values", title: "p-adic field, precision and valuation",
    short: String.raw`$K = \mathbb{Q}_p(g)$, with $g$ a root of the stated quadratic polynomial (in Sage: <code>Qp(p, cap).extension(f)</code>, not the default modulus of <code>Qq</code>). A value is $J = p^{v}(u_0 + u_1 g) + O(p^{N})$ with $u_0 + u_1 g$ a unit: $v = v(J)$ is the valuation, $N$ the absolute precision, $N - v$ the relative precision.`,
    body: String.raw`<p>The polynomial $f$ is the minimal polynomial of a generator of the maximal order of $\mathbb{Q}(\sqrt{D})$ for the first cocycle discriminant of the computation. The precision of the level (P700, P500, …) is the working precision; individual values carry slightly fewer digits.</p>`,
    see: ["jvalue", "sage"], source: "level-computations-dev/dvk_computation.py (_init_padic_field); SCHEMA.md", reviewed: false,
  },

  // METHODS
  lindep: {
    cat: "methods", title: "Lindep",
    short: String.raw`A search for a multiplicative relation $J^r \prod g^{c} \prod \varepsilon^{u} = $ (root of unity) in $H$, by lattice reduction on $p$-adic logarithms: $g$ runs over generators of powers of the prime ideals above a list of primes, $\varepsilon$ over units of $H$. The column says whether a relation was found and whether its polynomial is certified.`,
    body: String.raw`<p>The primes tried are those $\ell$ dividing $(D_{co} D_{cy} - x^2)/4$ for some $x$ and not split in either quadratic field, in stages of growing size. From a relation, the minimal polynomial $f$ of the value is reconstructed (<code>ff</code>), and <code>ffsmall</code> is a polredbest polynomial of the same field (it does not vanish at $J$).</p>
      <p>The $p$-adic logarithm forgets powers of $p$ and roots of unity, so the relation determines $J^r$ only up to them. The certificate comparison then checks at which number $f$ vanishes: at $J/p^{v(J)}$ or at $J$ (the <i>root</i>).</p>
      <ul><li><b>ok</b>: a relation was found and its polynomial vanishes at $J/p^{v}$ or at $J$;</li>
      <li><b>unverified</b>: a relation was found but its polynomial vanishes at neither; the certificate comparison does not count it;</li>
      <li><b>none</b>: no relation within the primes and dimensions tried;</li><li>“–”: no lindep file.</li></ul>
      <p>Lindep has no held-out check of its own.</p>`,
    see: ["primes", "support_lindep", "field_tier", "certificates"], source: "level_computations/recognition/lindep.py; darmonpoints/darmonvonk.py (prime_list_candidates); recognition/certificates.py (from_lindep)", reviewed: false,
  },
  primes: {
    cat: "methods", title: "Primes of a lindep relation",
    short: String.raw`The rational primes $\ell$ whose prime ideals appear with a non-zero exponent in the lindep relation. The relation uses one generator per prime ideal above $\ell$, so a prime can appear several times (different ideals above $\ell$, numbered $g_{\ell,1}, g_{\ell,2}, \dots$ on the value page). An empty list means $J$ is a unit up to powers of $p$ and roots of unity. A small “s” marks primes taken from the support lindep (when there is no staged lindep relation).`,
    see: ["lindep"], source: "SCHEMA.md", reviewed: false,
  },
  support_lindep: {
    cat: "methods", title: "Support lindep",
    short: String.raw`A lindep whose list of primes is the support of the element found by the in-field method (the primes $q$ with $v_{\mathfrak{P}}(x) \neq 0$ at some prime $\mathfrak{P}$ above $q$). It finds the relation by itself, in a much smaller lattice, and gives a second certificate from a different method. Only 7.6.5 has support lindeps.`,
    see: ["lindep", "in_field", "certificates"], source: "db_handlers/jvalues_core.py (save_cycle_support_lindeps)", reviewed: false,
  },
  algdep: {
    cat: "methods", title: "Algdep",
    short: String.raw`A search for a polynomial of given degree vanishing at $z$, where $z^{pw} = J\zeta$ for a root of unity $\zeta$ of $K$ and $pw \in \{1, 2, 4, 8, 16\}$, by lattice reduction (LLL). Several degrees are tried. The status is <b>success</b> when a polynomial was found whose height is small (below 5 times that of the polynomial of $H$), <b>returned</b> when one was found but it is not small, <b>none</b> otherwise.`,
    body: String.raw`<p>The candidates $z$ are the value times every root of unity of $K$ and their $2^d$-th roots, $d \le 4$. For each degree the page shows the root power $pw$, the order of $\zeta$, the polynomial <code>ff</code> (vanishing at $z$) and its polredbest form, and the polynomial of $J$ itself after removing the root (“de-rooted”). Algdep has a held-out check (“confirmed” in the certificates).</p>`,
    see: ["algdep_match", "certificates"], source: "level_computations/recognition/algdep.py; db_handlers/algdep_db.py (point_status, successful_keys, twist_data)", reviewed: false,
  },
  algdep_match: {
    cat: "methods", title: "Lindep field ≅ algdep field",
    short: String.raw`Whether the field defined by the lindep polynomial is isomorphic to the field of the smallest-degree successful algdep of the same value (PARI <code>nfisisom</code>, 10 s limit). “absent”: no successful algdep; “–”: no lindep.`,
    see: ["lindep", "algdep"], source: "db_handlers/lindep_db.py (algdep_matches)", reviewed: false,
  },
  in_field: {
    cat: "methods", title: "In-field recognition",
    short: String.raw`A search for an element $x$ of $L = H$ with $\iota(x) = (J\zeta)^e$ for an embedding $\iota: L \to K$, a root of unity $\zeta$ and a power $e$, without a list of primes: one lattice reduction in $\mathcal{O}_L$ (or $\mathcal{O}_L^2$). The column says whether a solution was accepted; $e$ is the power found.`,
    body: String.raw`<p>Two forms: the <b>quotient</b> form finds $\beta, \gamma \in \mathcal{O}_L$ with $\iota(\beta) = z\,\iota(\gamma)$, $x = \beta/\gamma$; the <b>involution</b> form (for norm-one values, $z \cdot \mathrm{Frob}(z) = 1$) finds $\beta$ with $x = \beta / s(\beta)$, $s$ an automorphism of order 2 (Hilbert 90).</p>
      <p><b>Acceptance</b>: the lattice is reduced with some digits held out, and the solution must also satisfy the congruence on them. A random lattice vector does so with probability about $p^{-\text{held}}$, without any arithmetic assumption. Coordinates are in the power basis of the generator of $L$.</p>`,
    see: ["certificates", "support_lindep", "H"], source: "level_computations/recognition/in_field.py", reviewed: false,
  },

  // CERTIFICATES AND FIELDS
  certificates: {
    cat: "certificates", title: "Certificates and their comparison",
    short: String.raw`Each method that recognizes $J$ claims an algebraic number. All claims are reduced to the minimal polynomial over $\mathbb{Q}$ of the canonical value $T = (J/p^{v(J)})^M$, $M = \operatorname{lcm}(12, p^2 - 1)$, which removes the roots of unity, powers and powers of $p$ on which the methods differ. <b>agree</b>: several methods count and give the same polynomial; <b>single</b>: one method counts; <b>conflict</b>: several count and some differ; <b>none</b>: none counts.`,
    body: String.raw`<p>For each certificate the page shows the degree of that polynomial, how many $p$-adic digits it cancels at $T$ (next to the precision of $T$), whether the method's own held-out check passed (“confirmed”; lindep has none) and whether it counts (a certificate whose check failed, or whose polynomial vanishes nowhere, is listed but not counted). Certificates with equal polynomials share a group (fingerprint).</p>
      <p><b>What agreement means.</b> Two methods that agree found the same algebraic number independently; a conflict means at least one accepted a spurious relation. Agreement is strong numerical evidence, not a proof that $J$ equals that number.</p>`,
    see: ["evidence", "cert_degree", "lindep", "algdep", "in_field"], source: "level_computations/recognition/certificates.py (compare)", reviewed: false,
  },
  cert_degree: {
    cat: "certificates", title: "Degree",
    short: String.raw`The degree over $\mathbb{Q}$ of the canonical polynomial (the minimal polynomial of $T = (J/p^{v})^M$), when all counted certificates have the same degree.`,
    see: ["certificates"], source: "SCHEMA.md", reviewed: false,
  },
  H: {
    cat: "certificates", title: "The field H",
    short: String.raw`$H$ is the compositum of the narrow ring class fields of the orders of discriminants $D_{co}$ and $D_{cy}$ (narrow Hilbert class fields when both are fundamental), given by a defining polynomial. It is the field where the conjectures place the values, and the field in which lindep and the in-field method search.`,
    see: ["T_field", "field_tier"], source: "level-computations-dev/dvk_wrappers.py (conjectural_field_poly)", reviewed: false,
  },
  T_field: {
    cat: "certificates", title: "The field T",
    short: String.raw`$T = \mathbb{Q}(\sqrt{D_{co}}, \sqrt{D_{cy}})$, the compositum of the two quadratic fields; a subfield of $H$. A value whose field lies in $T$ is called trivial.`,
    see: ["field_tier", "H"], source: "dvk_wrappers.py (trivial_subfield_poly)", reviewed: false,
  },
  field_tier: {
    cat: "certificates", title: "Field of J",
    short: String.raw`Where the field generated by the root of the lindep polynomial ($J$ or $J/p^{v}$, <i>not</i> $J^r$) sits relative to $H$: <b>trivial</b> (inside <a href="knowl.html?id=T_field">$T$</a>), <b>generating</b> (isomorphic to $H$), <b>in_H</b> (inside $H$, neither trivial nor all of $H$), <b>outside_H</b> (not inside $H$), <b>undecided</b> (a check timed out).`,
    body: String.raw`<p>When a value has no staged lindep relation but a <a href="knowl.html?id=support_lindep">support lindep</a> (7.6.5), the field of the support lindep is shown, marked with a small “s”.</p>
      <p>The checks are PARI's <code>nfisincl</code> and <code>nfisisom</code> on the polredbest polynomial, with a 10 s limit.</p>
      <p><b>What outside_H means.</b> The value $J$ (or $J/p^{v}$) itself does not lie in a subfield of $H$. It does <i>not</i> mean that the value was not recognized: the lindep relation still gives $J^r$ in $H$ up to a root of unity and a power of $p$. Typically $r > 1$ and $J$ generates a Kummer-type extension of $H$. Whether this is compatible with the conjectures depends on the parity and the normalization; see the articles.</p>`,
    see: ["H", "T_field", "lindep"], source: "db_handlers/report_utils.py (compute_field_checks)", reviewed: false,
  },
  evidence: {
    cat: "certificates", title: "Numerical evidence",
    short: String.raw`A recognition is a relation that holds to the stated number of $p$-adic digits. It is numerical evidence, not a proof. The site shows, for each value, the digits cancelled, the held-out checks and whether independent methods agree, so that the strength of the evidence can be judged.`,
    see: ["certificates"], source: "", reviewed: false,
  },

  // PRECOMPUTED DATA
  quaternion_algebra: {
    cat: "precomputed", title: "Quaternion algebra",
    short: String.raw`$B = \left(\frac{a, b}{\mathbb{Q}}\right)$ with $i^2 = a$, $j^2 = b$, $ij = -ji = k$, of discriminant $D$ (the product of the primes where $B$ ramifies). All algebras here are indefinite. Quaternions are written by their coordinates in $1, i, j, k$; the maximal order by a basis.`,
    see: ["eichler_order", "level"], source: "datasets/Precomputed_data/quaternion_algebras.json", reviewed: false,
  },
  eichler_order: {
    cat: "precomputed", title: "Eichler order",
    short: String.raw`An Eichler order $\mathcal{O}_N$ of level $N$ in $B$ (the intersection of two maximal orders; maximal when $N = 1$), given by a basis in the coordinates $1, i, j, k$.`,
    see: ["fuchsian_group", "optimal_embedding"], source: "datasets/Precomputed_data/eichler_orders.json", reviewed: false,
  },
  candidate: {
    cat: "precomputed", title: "Candidate",
    short: String.raw`A level $p.D.N$ prepared for computation: the prime $p$, the admissible discriminants up to a bound (the discriminants $\Delta$ for which the computation is possible, with optimal embeddings into $\mathcal{O}_N$), and the Hecke data for the killer.`,
    see: ["level", "killer", "sarith_group"], source: "datasets/Precomputed_data/candidates.json; Scripts/candidate_generation.py", reviewed: false,
  },
  optimal_embedding: {
    cat: "precomputed", title: "Optimal embeddings",
    short: String.raw`The optimal embeddings of the real quadratic order of discriminant $\Delta$ into $\mathcal{O}_N$, up to conjugation by $\mathcal{O}_N^1$, as computed by Q-Quadratic; each is given by the image of the generator of the order, in the coordinates $1, i, j, k$. Their positions are the indices $i$, $j$ of the J values.`,
    see: ["embeddings", "sc_label"], source: "datasets/Precomputed_data/embeddings.json", reviewed: false,
  },
  fuchsian_group: {
    cat: "precomputed", title: "Fuchsian group of an order",
    short: String.raw`The group $\mathcal{O}_N^1/\{\pm 1\}$ acting on the upper half plane, stored exactly: generators (quaternions), relation words, a fundamental domain, and the splitting at infinity. The abelian invariants of $\Gamma^{ab}$ are a check. It rebuilds the group without Magma.`,
    see: ["sarith_group", "eichler_order"], source: "darmonpoints-dev/darmonpoints/arithgroup_io.py", reviewed: false,
  },
  sarith_group: {
    cat: "precomputed", title: "S-arithmetic group",
    short: String.raw`The $p$-arithmetic group of a level, stored through the Fuchsian groups of the orders of levels $N$ and $Np$, the element $w_p$, the Bruhat–Tits representatives and the $p$-adic splitting.`,
    see: ["fuchsian_group", "level"], source: "darmonpoints-dev/darmonpoints/arithgroup_io.py", reviewed: false,
  },

  // USING THE DATA
  label: {
    cat: "usage", title: "Labels of values",
    short: String.raw`A value is labelled $p.D.N\text{-}D_{co}.D_{cy}\text{-}i.j\text{-}\mathrm{parity}$, e.g. <code>5.6.1-8.53-0.3-Je</code>: the level, the two discriminants, the two embedding positions and the parity. The label is the address of its page.`,
    see: ["level", "discriminants", "embeddings", "parity"], source: "SCHEMA.md", reviewed: false,
  },
  sage: {
    cat: "usage", title: "Sage code",
    short: String.raw`Every value has one line of Sage code that defines the field $K$, the value $J$ exactly (to its precision), the field $H$ and the lindep polynomial $f$ (with a comment saying where it vanishes). Every line was run in Sage and gives the stored value.`,
    body: String.raw`<p>On the table: Ctrl+double-click (⌘+double-click) a row copies its line; the checkboxes and “Copy selected as Sage” copy a block defining dictionaries <code>J[label]</code>, <code>f[label]</code> and <code>H[(Dco, Dcy)]</code>. Copying to the clipboard needs https or localhost; otherwise a window shows the text to copy.</p>`,
    see: ["padic_field", "label"], source: "exporter/export_jvalues.py (sage_line); tests/check_export.py", reviewed: false,
  },
  provenance: {
    cat: "usage", title: "Data version and provenance",
    short: String.raw`The data come from a versioned dataset repository at a stated commit, exported at a pinned precision per level. Each value page lists the files it was read from, the computation session, the Hecke killer and the code commits. The format is documented in SCHEMA.md.`,
    see: ["sage"], source: "SCHEMA.md; exporter/levels.json", reviewed: false,
  },
};
