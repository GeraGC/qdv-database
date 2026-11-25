// Explanations of the terms of the site ("knowls", after the LMFDB). Each entry:
//   title, cat (category), short (the first paragraph: shown in the popover, so it must say what the term is on its
//   own), body (further paragraphs on the full page; optional), see (related ids), source (where the definition comes
//   from), reviewed (false until checked by the authors).
// Math between $...$ is rendered with KaTeX. Bodies are HTML. Use kl(id, text) for a term that has its own entry
// (it opens that entry in a popover) and cite(key, loc) for a reference (an entry of the "references" category).
// Notation: that of [Gon26] specialised to F = Q (D, N, p instead of the ideals of the paper): B, R(N), R(pN),
// Gamma_0(N), quadratic orders O in K, optimal embeddings psi, cycles c^0_psi, cocycles Phi^•_psi, K_p, T (Hecke).
// DRAFT (2026-11-25): rewritten in the notation of [Gon26]; every entry must be reviewed before publication.

/** A term with its own entry: opens it in a popover (on every page that calls initKnowls). */
const kl = (id, text) => `<span class="kn" data-knowl="${id}" tabindex="0" role="button">${text}</span>`;

/** Short labels of the references (the entries ref_<key>). */
const REFS = {
  gon26: "Gon26", gmx21: "GMX21", dv21: "DV21", gre09: "Gre09", ric21: "Ric21", voi21: "Voi21",
  qq: "Q-Quadratic", dp: "darmonpoints", pari: "PARI/GP", magma: "Magma", sage: "SageMath",
};
/** A citation, e.g. cite("gmx21", "§4") gives [GMX21, §4], which opens the reference. */
const cite = (key, loc) => kl(`ref_${key}`, `[${REFS[key]}${loc ? `, ${loc}` : ""}]`);

const QQ_GUIDE = "https://github.com/JamesRickards-Canada/Q-Quadratic/blob/main/QQuadratic_GP_guide.pdf";

export const CATEGORIES = [
  ["setting", "Setting"],
  ["values", "J values"],
  ["methods", "Recognition methods"],
  ["certificates", "Certificates and fields"],
  ["precomputed", "Quaternion algebras and groups"],
  ["usage", "Using the data"],
  ["references", "References"],
];

export const KNOWLS = {
  // SETTING
  triplet: {
    cat: "setting", title: "Triplet p.D.N",
    short: String.raw`A triplet $p.D.N$ (e.g. 5.6.1) fixes the arithmetic data of a computation: an indefinite ${kl("quaternion_algebra", "quaternion algebra")} $B$ over $\mathbb{Q}$ of discriminant $D$, an ${kl("eichler_order", "Eichler order")} $R(N) \subseteq B$ of level $N$ (maximal when $N = 1$) and a prime $p \nmid DN$. The ${kl("cycle", "cycles")} and ${kl("cocycle", "cocycles")} are built from ${kl("optimal_embedding", "optimal embeddings")} of real quadratic orders into $R(N)$, and live on the groups $\Gamma_0(N) = R(N)^\times_1$ and $\Gamma_0(pN) = R(pN)^\times_1$ of norm-one units, where $R(pN) \subseteq R(N)$ is the suborder of level $pN$ ${cite("gon26", "§3.1")}.`,
    body: String.raw`<p>Since $p \nmid D$, $B$ splits at $p$. The embeddings $\iota_p \colon B \hookrightarrow M_2(\mathbb{Q}_p)$ and $\iota_\infty \colon B \hookrightarrow M_2(\mathbb{R})$ are fixed with $\iota_p(R(N) \otimes \mathbb{Z}_p) = M_2(\mathbb{Z}_p)$ and $\iota_p(R(pN) \otimes \mathbb{Z}_p)$ the matrices with lower left entry in $p\mathbb{Z}_p$. Through them $\Gamma_0(N)$ acts on the $p$-adic upper half plane $\mathcal{H}_p = \mathbb{P}^1(\mathbb{C}_p) \setminus \mathbb{P}^1(\mathbb{Q}_p)$ and on the complex upper half plane $\mathcal{H}$.</p>
      <p>The quadratic orders that can be used are those of the ${kl("candidate", "admissible discriminants")} of the triplet (in particular $p$ is inert in their fields). The case $N = 1$ is the construction of ${cite("gmx21")}; when the Shimura curve $\Gamma_0(N) \backslash \mathcal{H}$ has positive genus (all exported triplets with $N > 1$) the construction needs a ${kl("killer", "Hecke killer")}. The groups of each triplet are stored as ${kl("sarith_group", "group data")}.</p>`,
    see: ["jvalue", "candidate", "quaternion_algebra", "eichler_order", "sarith_group"], source: "[Gon26, §3.1]; datasets/Precomputed_data/candidates.json; level-computations-dev/dvk_computation.py",
    reviewed: false,
  },
  discriminants: {
    cat: "setting", title: "Discriminants Dco and Dcy",
    short: String.raw`A ${kl("jvalue", "J value")} pairs a ${kl("cocycle", "cocycle")} and a ${kl("cycle", "cycle")}, attached to optimal embeddings into $R(N)$ of two real quadratic orders $\mathcal{O}_{co} \subseteq K_{co}$ and $\mathcal{O}_{cy} \subseteq K_{cy}$. $D_{co}$ and $D_{cy}$ are their discriminants: $D_{co}$ that of the order defining the cocycle $\Phi^\bullet_\psi$, $D_{cy}$ that of the order defining the cycle $c^0_{\psi'}$ at which it is evaluated. Both are ${kl("candidate", "admissible")} for the triplet, and $K_{co} = \mathbb{Q}(\sqrt{D_{co}})$, $K_{cy} = \mathbb{Q}(\sqrt{D_{cy}})$.`,
    body: String.raw`<p>In general a discriminant is $\Delta = d_K f^2$, with $d_K$ the discriminant of $K = \mathbb{Q}(\sqrt{\Delta})$, and $\mathcal{O}$ is the order of conductor $f$ of $K$; the class field attached to $\mathcal{O}$ is then the narrow ring class field of conductor $f$ (see ${kl("H", "the field $H$")}). All the exported discriminants are fundamental ($f = 1$, $\mathcal{O} = \mathcal{O}_K$).</p>`,
    see: ["embeddings", "H", "candidate"], source: "level-computations-dev/dvk_wrappers.py (conjectural_field_poly)",
    reviewed: false,
  },
  embeddings: {
    cat: "setting", title: "Embeddings i and j",
    short: String.raw`$i$ and $j$ identify the two ${kl("optimal_embedding", "optimal embeddings")} of a ${kl("jvalue", "J value")} $J^\bullet(\psi_i, \psi'_j)$: $\psi_i \in \mathcal{E}(\mathcal{O}_{co}, R(N))$ defines the ${kl("cocycle", "cocycle")} and $\psi'_j \in \mathcal{E}(\mathcal{O}_{cy}, R(N))$ the ${kl("cycle", "cycle")}. Each index is a position (from 0) in a fixed list of representatives of the $\Gamma_0(N)$-conjugacy classes of optimal embeddings of the order into $R(N)$, computed once and stored. The order of the list is the output order of ${cite("qq")} and has no arithmetic meaning; the ${kl("sc_label", "(S, c) labels")} describe the classes intrinsically.`,
    body: String.raw`<p>The list for $(D, N, \Delta)$ is the output of Q-Quadratic's <code>qa_embed</code> ${cite("qq")} (<a href="${QQ_GUIDE}">GP guide</a>), which gives each embedding $\psi$ by $\psi\big((\delta + \sqrt{\Delta})/2\big)$, $\delta \in \{0, 1\}$, $\delta \equiv \Delta \pmod 2$. Its length is $\#\,\Gamma_0(N) \backslash \mathcal{E}(\mathcal{O}, R(N))$, which is $2^{\omega(DN)} h^+(\Delta)$ when $\Delta$ is coprime to $DN$ ($\omega$ the number of prime divisors, $h^+$ the narrow class number). Every computation of the triplet reads the same list, so the indices are consistent across the database.</p>`,
    see: ["sc_label", "optimal_embedding", "label"], source: "level-computations-dev/data_management.py (qa_embed); level_computations/embedding_labels.py",
    reviewed: false,
  },
  sc_label: {
    cat: "setting", title: "(S, c) labels of embeddings",
    short: String.raw`An intrinsic name for a class of ${kl("optimal_embedding", "optimal embeddings")}, relative to the class of embedding 0. For $\Delta$ coprime to $DN$, the classes $\Gamma_0(N) \backslash \mathcal{E}(\mathcal{O}, R(N))$ form a torsor under $\{\pm 1\}^{\omega(DN)} \times \mathrm{Cl}^+(\mathcal{O})$: a local orientation at each prime $\ell \mid DN$, and the narrow class group ${cite("ric21", "§4.4–4.5")}. The label $(S, c)$ of $\psi_i$ says that $\psi_i$ is obtained from $\psi_0$ by changing the orientations at the primes of $S$ (with the Atkin–Lehner element $w_S$) and then acting by the narrow class of position $c$ in the list of Q-Quadratic's <code>bqf_ncgp_lexic</code> ${cite("qq")}.`,
    body: String.raw`<p>Labels are written $(\emptyset, 0)$, $(\{2,3\}, 1)$, … ; $(\emptyset, 0)$ is embedding 0 itself. <code>bqf_ncgp_lexic</code> lists representatives of $\mathrm{Cl}^+(\Delta)$ lexicographically, starting with the identity, the component of highest order moving first (<a href="${QQ_GUIDE}">GP guide</a>). The labels were computed with ${cite("ric21", "Thm 4.5.4")}. They are available for the triplets 5.6.1 and 3.10.1; for the other triplets the column shows “–”.</p>`,
    see: ["embeddings", "optimal_embedding"], source: "investigations/j_shimura_reciprocity/labels.py; level_computations/embedding_labels.py",
    reviewed: false,
  },
  cycle: {
    cat: "setting", title: "Cycle c⁰ of an embedding",
    short: String.raw`To an ${kl("optimal_embedding", "optimal embedding")} $\psi' \in \mathcal{E}(\mathcal{O}_{cy}, R(N))$ one attaches $c_{\psi'} = [\gamma_{\psi'} \otimes \tau_{\psi',p}] \in H_1(\Gamma_0(N), \mathrm{Div}\, A_0)$, where $\gamma_{\psi'} = \psi'(u)$ for $u$ a generator of the norm-one units of $\mathcal{O}_{cy}$ modulo torsion, and $\tau_{\psi',p} \in \mathcal{H}_p$ is its fixed point on which $\psi'(a)$ acts by $a$. The cycle at which the ${kl("cocycle", "cocycles")} are evaluated is a lift $c^0_{\psi'} \in H_1(\Gamma_0(N), \mathrm{Div}^0 A_0)$ of $m\, T c_{\psi'}$, with $T$ the ${kl("killer", "Hecke killer")} and $m$ the ${kl("cycle_factor", "cycle factor")} ${cite("gon26", "§3.2")}.`,
    body: String.raw`<p>$A_0 = \{z \in \mathbb{C}_p : |z| \le 1,\ |z - t| \ge 1 \text{ for all } t \in \mathbb{Z}_p\}$ is the standard affinoid, preserved by $\Gamma_0(N)$; up to conjugating $\psi'$ one may assume $\tau_{\psi',p} \in A_0$ ${cite("gon26", "Lemma 3.5")}. The obstruction to lifting $c_{\psi'}$ to degree zero is its degree in $H_1(\Gamma_0(N), \mathbb{Z})$, which a Hecke operator $T$ kills; the lift depends on $T$ and is determined up to the image of $H_2(\Gamma_0(N), \mathbb{Z})$ ${cite("gon26", "Rem. 3.10")}. The construction follows ${cite("gre09", "§7")} and ${cite("gmx21", "§3")}.</p>`,
    see: ["cocycle", "killer", "cycle_factor", "jvalue"], source: "[Gon26, §3.2]; darmonpoints/darmonvonk.py (darmon_vonk_cycle)",
    reviewed: false,
  },
  cocycle: {
    cat: "setting", title: "Cocycles Φ of an embedding",
    short: String.raw`To an ${kl("optimal_embedding", "optimal embedding")} $\psi \in \mathcal{E}(\mathcal{O}_{co}, R(N))$ one attaches $\varphi_\psi \in H^1(\Gamma_0(N), \mathrm{Div}\, A_0)$, which records the signed intersections of the paths $C(x, \gamma x)$ with the $\Gamma_0(N)$-translates of the geodesic of $\gamma_\psi$, together with the corresponding translates of the $p$-adic fixed point $\tau_{\psi,p}$. After a ${kl("killer", "Hecke killer")} it lifts to $\varphi^0_\psi$ with values in $\mathrm{Div}^0 A_0$, and $\phi_\psi = (\eta \circ \mathrm{res} \circ W_p)(\varphi^0_\psi) \in H^1(\Gamma_0(pN), \Lambda)$. The evaluated cocycles are $\Phi^-_\psi = \sum_{n \ge 0} U_p^n \phi_\psi$, $\Phi^+_\psi = \sum_{n \ge 0} (-1)^{n+1} U_p^n \phi_\psi$, $\Phi^{\mathrm{even}}_\psi = \sum_{n \text{ even}} U_p^n \phi_\psi$ and $\Phi^{\mathrm{odd}}_\psi = \sum_{n \text{ odd}} U_p^n \phi_\psi$ ${cite("gon26", "§3.3–3.4")}.`,
    body: String.raw`<p>Explicitly, $\varphi_\psi(\gamma) = \sum_\omega \delta_\gamma(\omega)\, \omega_p$, the sum over the $\Gamma_0(N)$-orbit of the real fixed point $\tau_{\psi,\infty}$ of $\iota_\infty(\gamma_\psi)$: $\delta_\gamma(\omega) \in \{0, \pm 1\}$ is the signed intersection of $C(x, \gamma x)$ with $C(\omega, \omega')$, and $\omega_p = \gamma_\omega^{-1} \tau_{\psi,p}$ for any $\gamma_\omega \in \Gamma_0(N)$ with $\gamma_\omega \omega = \tau_{\psi,\infty}$. The sum is finite and the class does not depend on the base point $x$ ${cite("gon26", "Prop. 3.18, 3.24")}.</p>
      <p>$W_p$ is the Atkin–Lehner operator of an element $w_p \in R(pN)$ of reduced norm $p$, $\mathrm{res}$ the restriction from $\Gamma_0(N)$ to $\Gamma_0(pN)$, $\eta(P - Q) = \mathrm{dlog}\big((x - P)/(x - Q)\big)$, and $\Lambda$ a ring of power series over $\bar{\mathbb{Z}}_p$; $U_p$ is the Hecke operator at $p$ ${cite("gon26", "Def. 3.25–3.27")}. Thus $\Phi^+_\psi = \Phi^{\mathrm{odd}}_\psi - \Phi^{\mathrm{even}}_\psi$ and $\Phi^-_\psi = \Phi^{\mathrm{odd}}_\psi + \Phi^{\mathrm{even}}_\psi$. The signs of $\Phi^\pm_\psi$ are exchanged with respect to ${cite("gmx21", "§5")}, to match the $J^+$ of ${cite("dv21")} ${cite("gon26", "Rem. 3.28")}. In practice the series are truncated when the terms are below the working ${kl("padic_field", "precision")}.</p>`,
    see: ["cycle", "parity", "killer", "jvalue"], source: "[Gon26, §3.3–3.4]; darmonpoints/darmonvonk.py (darmon_vonk_cocycle, OverconvergentDVCocycle)",
    reviewed: false,
  },
  killer: {
    cat: "setting", title: "Hecke killer",
    short: String.raw`The ${kl("cycle", "cycle")} $c_{\psi'}$ and the ${kl("cocycle", "cocycle")} $\varphi_\psi$ lift to $\mathrm{Div}^0 A_0$-valued classes only if their degrees in $H_1(\Gamma_0(N), \mathbb{Z})$ and $H^1(\Gamma_0(N), \mathbb{Z})$ vanish. The Hecke killer is a Hecke operator $T$ killing both degrees: $T c_{\psi'}$ and $T \varphi_\psi$ are lifted instead ${cite("gon26", "§3.2–3.3")}. It is needed when the Shimura curve $\Gamma_0(N) \backslash \mathcal{H}$ has positive genus; in genus 0, $H_1(\Gamma_0(N), \mathbb{Z})$ is finite, $H^1(\Gamma_0(N), \mathbb{Z}) = 0$, and an integer ${kl("cycle_factor", "cycle factor")} suffices. The operator used is shown for each triplet and run.`,
    body: String.raw`<p>The genus of $\Gamma_0(N) \backslash \mathcal{H}$ is the dimension of $S_2(\Gamma_0(DN))^{D\text{-new}}$ (Jacquet–Langlands), and $H_1(\Gamma_0(N), \mathbb{Z})$ has rank twice the genus ${cite("gon26", "Rem. 3.11")}. The exported triplets with $N = 1$ (5.6.1 and 3.10.1) have genus 0; those with $N > 1$ have positive genus.</p>
      <p>All exported triplets with $N > 1$ use a killer of type B: a linear combination of operators $T_\ell$, $\ell \nmid DNp$, killing both degrees. Types A (a polynomial in one $T_\ell$) and C (involving $U_\ell$ or $W_\ell$) were also considered. The lifted classes, hence the values, depend on the choice of $T$ ${cite("gon26", "Rem. 3.10")}.</p>`,
    see: ["cycle", "cocycle", "cycle_factor", "triplet"], source: "[Gon26, §3.2–3.3]; level_computations/hecke_killers.py; investigations/i_level_feasibility/probe.py (select)",
    reviewed: false,
  },

  // VALUES
  jvalue: {
    cat: "values", title: "J value",
    short: String.raw`$J^\bullet(\psi, \psi') \in K_p^\times$ is the value of the ${kl("cocycle", "cocycle")} $\Phi^\bullet_\psi$ attached to an ${kl("embeddings", "embedding")} $\psi = \psi_i$ of discriminant $D_{co}$ at the ${kl("cycle", "cycle")} $c^0_{\psi'}$ attached to an embedding $\psi' = \psi'_j$ of discriminant $D_{cy}$, through the multiplicative pairing of ${cite("gmx21", "§6")}, in one of four ${kl("parity", "parities")} $\bullet \in \{+, -, e, o\}$. It lies in the ${kl("padic_field", "$p$-adic field $K_p$")} and is known to a finite precision. Guitart, Masdeu and Xarles conjecture that such values are algebraic and lie in the ${kl("H", "field $H$")} ${cite("gmx21")}, extending the conjectures of Darmon and Vonk ${cite("dv21")}; see the articles for the precise statements.`,
    body: String.raw`<p>The page of a value shows its $p$-adic expansion, the stored raw evaluations, the recognitions found by each method (${kl("lindep", "lindep")}, ${kl("algdep", "algdep")}, ${kl("in_field", "in-field")}) and their ${kl("certificates", "comparison")}. The value is named by its ${kl("label", "label")}.</p>`,
    see: ["parity", "padic_field", "H", "certificates", "evidence"], source: "level-computations-dev/db_handlers/jvalues_db.py",
    reviewed: false,
  },
  parity: {
    cat: "values", title: "Parities Jp, Jm, Je, Jo",
    short: String.raw`Each pair $(\psi, \psi')$ gives four values. With $\langle \cdot, \cdot \rangle$ the multiplicative pairing and $J_0 = \langle \varphi^0_\psi, c^0_{\psi'} \rangle$ the pairing of the ${kl("cocycle", "cocycle")} before $W_p$ and $U_p$ with the ${kl("cycle", "cycle")}: $J^+ = J_0 \langle \Phi^+_\psi, c^0_{\psi'} \rangle$ (Jp), $J^- = J_0 \langle \Phi^-_\psi, c^0_{\psi'} \rangle$ (Jm), $J^e = J_0 \langle \Phi^{\mathrm{odd}}_\psi, c^0_{\psi'} \rangle$ (Je) and $J^o = \langle \Phi^{\mathrm{even}}_\psi, c^0_{\psi'} \rangle$ (Jo). The labels e and o follow the naming of the code, opposite to that of ${cite("gon26", "Def. 3.27")}; see below.`,
    body: String.raw`<p>The datasets store three raw evaluations: $J_{\mathrm{even}} = \langle \Phi^{\mathrm{odd}}_\psi, c^0_{\psi'} \rangle$, $J_{\mathrm{odd}} = \langle \Phi^{\mathrm{even}}_\psi, c^0_{\psi'} \rangle$ (the names of the code) and $J_0$. The four parities are $J^+ = J_{\mathrm{even}} J_0 / J_{\mathrm{odd}}$, $J^- = J_{\mathrm{even}} J_{\mathrm{odd}} J_0$, $J^e = J_{\mathrm{even}} J_0$ and $J^o = J_{\mathrm{odd}}$; these formulas are checked on the exported raw values for every point.</p>
      <p><b>Naming.</b> ${cite("dp")} calls “even” the sum of $U_p^n \phi_\psi$ over odd $n$ (the terms $n \ge 1$ split by the parity of $n - 1$), so the labels Je and Jo correspond to $\Phi^{\mathrm{odd}}_\psi$ and $\Phi^{\mathrm{even}}_\psi$ of ${cite("gon26", "Def. 3.27")}. $J^\pm$ agree with $\Phi^\pm_\psi$. The naming will be made consistent in a later version.</p>
      <p>$J_0$ is a product of cross-ratios of points of $K_{co}$ and $K_{cy}$, so it lies in ${kl("T_field", "$K_{co} K_{cy}$")}; including it lowers the heights of the values. When a ${kl("cycle_factor", "scaling")} $s \neq 1$ is stored, each parity is replaced by an $s$-th root; every exported value has $s = 1$.</p>`,
    see: ["jvalue", "cocycle", "cycle_factor"], source: "[Gon26, Def. 3.27]; level-computations-dev/dvk_wrappers.py (dvk_J_values_mult); darmonpoints/darmonvonk.py (OverconvergentDVCocycle.improve)",
    reviewed: false,
  },
  cycle_factor: {
    cat: "values", title: "Cycle factor and scaling",
    short: String.raw`The cycle factor is the positive integer $m$ such that $m\, T c_{\psi'}$ lifts to the degree-zero ${kl("cycle", "cycle")} $c^0_{\psi'}$ ($T$ the ${kl("killer", "Hecke killer")}, or $T = 1$); in genus 0 an integer always suffices ${cite("gon26", "Rem. 3.11")}. The stored values are those of the lift of $m\, T c_{\psi'}$: the value at the lift of $T c_{\psi'}$ would be an $m$-th root, determined only up to roots of unity, and is not taken. The scaling $s$ is an extra integer multiple of the cycle and the cocycle allowed by the code; it is 1 for every exported value.`,
    see: ["cycle", "killer", "parity"], source: "darmonpoints/darmonvonk.py (darmon_vonk_cycle: zero_degree_equivalent); db_handlers/jvalues_core.py (cycle_factor)",
    reviewed: false,
  },
  padic_field: {
    cat: "values", title: "p-adic field, precision and valuation",
    short: String.raw`The ${kl("jvalue", "J values")} lie in $K_p$, the completion at $p$ of $K_{co}$ and $K_{cy}$ (both have $p$ inert, so $K_p$ is the unramified quadratic extension of $\mathbb{Q}_p$). It is given as $K_p = \mathbb{Q}_p(g)$, $g$ a root of the stated quadratic polynomial (in ${cite("sage")}: <code>Qp(p, cap).extension(f)</code>, not the default modulus of <code>Qq</code>). A value is $J = p^{v}(u_0 + u_1 g) + O(p^{P})$ with $u_0 + u_1 g$ a unit: $v = v(J)$ is the valuation, $P$ the absolute precision and $P - v$ the relative precision.`,
    body: String.raw`<p>The polynomial is the minimal polynomial of a generator of $\mathcal{O}_K$, $K = \mathbb{Q}(\sqrt{D_{co}})$, for the first cocycle discriminant of the computation (e.g. $x^2 - 2$ for 5.6.1, from $D_{co} = 8$). The precision of the triplet (P700, P500, …) is the working precision; individual values carry slightly fewer digits.</p>`,
    see: ["jvalue", "sage"], source: "level-computations-dev/dvk_computation.py (_init_padic_field); SCHEMA.md",
    reviewed: false,
  },

  // METHODS
  lindep: {
    cat: "methods", title: "Lindep",
    short: String.raw`A search for a multiplicative relation $J^r \prod g^{c} \prod \varepsilon^{u} = $ (root of unity) in the ${kl("H", "field $H$")}, by lattice reduction on $p$-adic logarithms: $g$ runs over generators of powers of the prime ideals above a list of ${kl("primes", "primes")}, $\varepsilon$ over the units of $H$. The column says whether a relation was found and whether its polynomial vanishes at the value (“ok”), see below.`,
    body: String.raw`<p>The primes tried are those $\ell$ dividing $(D_{co} D_{cy} - x^2)/4$ for some integer $x$ and not split in $K_{co}$ or $K_{cy}$, in stages of growing size. From a relation, the minimal polynomial $f$ of the value is reconstructed (shown as <code>ff</code>), and <code>ffsmall</code> is a <code>polredbest</code> ${cite("pari")} polynomial of the same field (it does not vanish at $J$).</p>
      <p>The $p$-adic logarithm forgets powers of $p$ and roots of unity, so the relation determines $J^r$ only up to them. The ${kl("certificates", "certificate comparison")} then checks at which number $f$ vanishes: at $J/p^{v(J)}$ or at $J$ (the <i>root</i>).</p>
      <ul><li><b>ok</b>: a relation was found and its polynomial vanishes at $J/p^{v}$ or at $J$;</li>
      <li><b>unverified</b>: a relation was found but its polynomial vanishes at neither; the certificate comparison does not count it;</li>
      <li><b>none</b>: no relation within the primes and dimensions tried;</li><li>“–”: no lindep file.</li></ul>
      <p>Lindep has no held-out check of its own.</p>`,
    see: ["primes", "support_lindep", "field_tier", "certificates"], source: "level_computations/recognition/lindep.py; darmonpoints/darmonvonk.py (prime_list_candidates); recognition/certificates.py (from_lindep)",
    reviewed: false,
  },
  primes: {
    cat: "methods", title: "Primes of a lindep relation",
    short: String.raw`The rational primes $\ell$ whose prime ideals appear with a non-zero exponent in the ${kl("lindep", "lindep")} relation. The relation uses one generator per prime ideal above $\ell$, so a prime can appear several times (different ideals above $\ell$, numbered $g_{\ell,1}, g_{\ell,2}, \dots$ on the value page). An empty list means that $J$ is a unit up to powers of $p$ and roots of unity. A small “s” marks primes taken from the ${kl("support_lindep", "support lindep")} (when there is no staged lindep relation).`,
    see: ["lindep", "support_lindep"], source: "SCHEMA.md",
    reviewed: false,
  },
  support_lindep: {
    cat: "methods", title: "Support lindep",
    short: String.raw`A ${kl("lindep", "lindep")} whose list of primes is the support of the element found by the ${kl("in_field", "in-field method")}: the primes $q$ with $v_{\mathfrak{P}}(x) \neq 0$ at some prime $\mathfrak{P}$ of $H$ above $q$. It finds the relation by itself, in a much smaller lattice, and gives a second ${kl("certificates", "certificate")} from a different method. Only the triplet 7.6.5 has support lindeps.`,
    see: ["lindep", "in_field", "certificates"], source: "db_handlers/jvalues_core.py (save_cycle_support_lindeps)",
    reviewed: false,
  },
  algdep: {
    cat: "methods", title: "Algdep",
    short: String.raw`A search, by lattice reduction (LLL), for a polynomial of given degree vanishing at $z$, where $z^{pw} = J\zeta$ for a root of unity $\zeta \in K_p$ and $pw \in \{1, 2, 4, 8, 16\}$. Several degrees are tried. The status is <b>success</b> when a polynomial was found whose height is small (below 5 times that of the defining polynomial of ${kl("H", "$H$")}), <b>returned</b> when one was found but it is not small, and <b>none</b> otherwise.`,
    body: String.raw`<p>The candidates $z$ are the value times every root of unity of ${kl("padic_field", "$K_p$")} and their $2^d$-th roots, $d \le 4$. For each degree the page shows the root power $pw$, the order of $\zeta$, the polynomial <code>ff</code> (vanishing at $z$) and its <code>polredbest</code> ${cite("pari")} form, and the polynomial of $J$ itself after removing the root (“de-rooted”). Algdep has a held-out check (“confirmed” in the ${kl("certificates", "certificates")}).</p>`,
    see: ["algdep_match", "certificates"], source: "level_computations/recognition/algdep.py; db_handlers/algdep_db.py (point_status, successful_keys, twist_data)",
    reviewed: false,
  },
  algdep_match: {
    cat: "methods", title: "Lindep field ≅ algdep field",
    short: String.raw`Whether the field defined by the ${kl("lindep", "lindep")} polynomial is isomorphic to the field of the smallest-degree successful ${kl("algdep", "algdep")} of the same value (<code>nfisisom</code> of ${cite("pari")}, 10 s limit). “absent”: no successful algdep; “–”: no lindep.`,
    see: ["lindep", "algdep"], source: "db_handlers/lindep_db.py (algdep_matches)",
    reviewed: false,
  },
  in_field: {
    cat: "methods", title: "In-field recognition",
    short: String.raw`A search for an element $x$ of $L = $ ${kl("H", "$H$")} with $\iota(x) = (J\zeta)^e$ for an embedding $\iota \colon L \hookrightarrow K_p$, a root of unity $\zeta$ and a power $e$, without a list of primes: one lattice reduction in $\mathcal{O}_L$ (or $\mathcal{O}_L^2$). The column says whether a solution was accepted; $e$ is the power found.`,
    body: String.raw`<p>Two forms: the <b>quotient</b> form finds $\beta, \gamma \in \mathcal{O}_L$ with $\iota(\beta) = z\,\iota(\gamma)$, $x = \beta/\gamma$; the <b>involution</b> form (for norm-one values, $z \cdot \mathrm{Frob}(z) = 1$) finds $\beta$ with $x = \beta / s(\beta)$, $s$ an automorphism of order 2 (Hilbert 90).</p>
      <p><b>Acceptance</b>: the lattice is reduced with some digits held out, and the solution must also satisfy the congruence on them. A random lattice vector does so with probability about $p^{-\text{held}}$, without any arithmetic assumption. Coordinates are in the power basis of the generator of $L$.</p>`,
    see: ["certificates", "support_lindep", "H"], source: "level_computations/recognition/in_field.py",
    reviewed: false,
  },

  // CERTIFICATES AND FIELDS
  certificates: {
    cat: "certificates", title: "Certificates and their comparison",
    short: String.raw`Each method that recognizes $J$ (${kl("lindep", "lindep")}, ${kl("algdep", "algdep")}, ${kl("in_field", "in-field")}) claims an algebraic number. All claims are reduced to the minimal polynomial over $\mathbb{Q}$ of the canonical value $\tilde{J} = (J/p^{v(J)})^M$, $M = \operatorname{lcm}(12, p^2 - 1)$, which removes the roots of unity, powers and powers of $p$ on which the methods differ. <b>agree</b>: several methods count and give the same polynomial; <b>single</b>: one method counts; <b>conflict</b>: several count and some differ; <b>none</b>: none counts.`,
    body: String.raw`<p>For each certificate the page shows the ${kl("cert_degree", "degree")} of that polynomial, how many $p$-adic digits it cancels at $\tilde{J}$ (next to the precision of $\tilde{J}$), whether the method's own held-out check passed (“confirmed”; lindep has none) and whether it counts (a certificate whose check failed, or whose polynomial vanishes nowhere, is listed but not counted). Certificates with equal polynomials share a group (fingerprint).</p>
      <p><b>What agreement means.</b> Two methods that agree found the same algebraic number independently; a conflict means that at least one accepted a spurious relation. Agreement is strong ${kl("evidence", "numerical evidence")}, not a proof that $J$ equals that number.</p>`,
    see: ["evidence", "cert_degree", "lindep", "algdep", "in_field"], source: "level_computations/recognition/certificates.py (compare)",
    reviewed: false,
  },
  cert_degree: {
    cat: "certificates", title: "Degree",
    short: String.raw`The degree over $\mathbb{Q}$ of the canonical polynomial of a value (the minimal polynomial of $\tilde{J} = (J/p^{v(J)})^M$, see ${kl("certificates", "certificates")}), when all counted certificates have the same degree.`,
    see: ["certificates"], source: "SCHEMA.md",
    reviewed: false,
  },
  H: {
    cat: "certificates", title: "The field H",
    short: String.raw`$H$ is the compositum of the narrow ring class fields of the orders $\mathcal{O}_{co}$ and $\mathcal{O}_{cy}$ of ${kl("discriminants", "discriminants")} $D_{co}$ and $D_{cy}$ (their narrow Hilbert class fields when both are fundamental), given by a defining polynomial. It is the field where the conjectures place the ${kl("jvalue", "J values")} ${cite("gmx21")}, and the field in which ${kl("lindep", "lindep")} and the ${kl("in_field", "in-field method")} search.`,
    body: String.raw`<p>The polynomial is computed with <code>bnrclassfield</code> and <code>polcompositum</code> of ${cite("pari")}, reduced with <code>polredabs</code> when a narrow class group is not cyclic or a discriminant is not fundamental (so that it does not depend on the run).</p>`,
    see: ["T_field", "field_tier", "discriminants"], source: "level-computations-dev/dvk_wrappers.py (conjectural_field_poly)",
    reviewed: false,
  },
  T_field: {
    cat: "certificates", title: "The field Kco Kcy",
    short: String.raw`$K_{co} K_{cy} = \mathbb{Q}(\sqrt{D_{co}}, \sqrt{D_{cy}})$, the compositum of the two real quadratic fields of a value; it is a subfield of ${kl("H", "$H$")}. A value whose field lies in $K_{co} K_{cy}$ is called trivial (${kl("field_tier", "field of J")}).`,
    see: ["field_tier", "H"], source: "dvk_wrappers.py (trivial_subfield_poly)",
    reviewed: false,
  },
  field_tier: {
    cat: "certificates", title: "Field of J",
    short: String.raw`Where the field generated by the root of the ${kl("lindep", "lindep")} polynomial ($J$ or $J/p^{v}$, <i>not</i> $J^r$) sits relative to ${kl("H", "$H$")}: <b>trivial</b> (inside ${kl("T_field", "$K_{co} K_{cy}$")}), <b>generating</b> (isomorphic to $H$), <b>in_H</b> (inside $H$, neither trivial nor all of $H$), <b>outside_H</b> (not inside $H$), <b>undecided</b> (a check timed out).`,
    body: String.raw`<p>When a value has no staged lindep relation but a ${kl("support_lindep", "support lindep")} (7.6.5), the field of the support lindep is shown, marked with a small “s”.</p>
      <p>The checks are <code>nfisincl</code> and <code>nfisisom</code> of ${cite("pari")} on the polredbest polynomial, with a 10 s limit.</p>
      <p><b>What outside_H means.</b> The value $J$ (or $J/p^{v}$) itself does not lie in a subfield of $H$. It does <i>not</i> mean that the value was not recognized: the lindep relation still gives $J^r$ in $H$ up to a root of unity and a power of $p$. Typically $r > 1$ and $J$ generates a Kummer-type extension of $H$. Whether this is compatible with the conjectures depends on the ${kl("parity", "parity")} and the normalization; see the articles.</p>`,
    see: ["H", "T_field", "lindep"], source: "db_handlers/report_utils.py (compute_field_checks)",
    reviewed: false,
  },
  evidence: {
    cat: "certificates", title: "Numerical evidence",
    short: String.raw`A recognition is a relation that holds to the stated number of $p$-adic digits. It is numerical evidence, not a proof. The site shows, for each value, the digits cancelled, the held-out checks and whether independent methods agree (${kl("certificates", "certificates")}), so that the strength of the evidence can be judged.`,
    see: ["certificates"], source: "",
    reviewed: false,
  },

  // PRECOMPUTED DATA
  quaternion_algebra: {
    cat: "precomputed", title: "Quaternion algebra",
    short: String.raw`$B = \left(\frac{a, b}{\mathbb{Q}}\right)$, with basis $1, i, j, k$, $i^2 = a$, $j^2 = b$, $ij = -ji = k$, of discriminant $D$: the product of the primes at which $B$ ramifies ($B \otimes \mathbb{Q}_\ell$ a division algebra). All algebras here are indefinite ($B \otimes \mathbb{R} \cong M_2(\mathbb{R})$), so $D$ is a product of an even number of primes. Quaternions are written by their coordinates in $1, i, j, k$ ${cite("voi21")}.`,
    see: ["eichler_order", "triplet"], source: "datasets/Precomputed_data/quaternion_algebras.json",
    reviewed: false,
  },
  eichler_order: {
    cat: "precomputed", title: "Eichler order",
    short: String.raw`An Eichler order $R(N)$ of level $N$ in the ${kl("quaternion_algebra", "quaternion algebra")} $B$: the intersection of two maximal orders, with $R(N) \otimes \mathbb{Z}_\ell \cong \begin{pmatrix} \mathbb{Z}_\ell & \mathbb{Z}_\ell \\ N\mathbb{Z}_\ell & \mathbb{Z}_\ell \end{pmatrix}$ for $\ell \mid N$ and maximal at the other primes; $R(1)$ is a maximal order ${cite("voi21")}. It is given by a $\mathbb{Z}$-basis in the coordinates $1, i, j, k$. Each ${kl("triplet", "triplet")} uses $R(N)$ and its suborder $R(pN)$.`,
    see: ["fuchsian_group", "optimal_embedding", "triplet"], source: "[Gon26, Def. 2.7]; datasets/Precomputed_data/eichler_orders.json",
    reviewed: false,
  },
  candidate: {
    cat: "precomputed", title: "Candidate and admissible discriminants",
    short: String.raw`The precomputed data of a ${kl("triplet", "triplet")} $p.D.N$: the prime $p$, the admissible discriminants up to a bound, and Hecke data. A discriminant $\Delta$ is admissible when it is a fundamental discriminant, $\Delta > 1$, no prime $\ell \mid Dp$ splits in $\mathbb{Q}(\sqrt{\Delta})$, no prime $\ell \mid N$ is inert in it, and $p \nmid \Delta$; then $p$ is inert in $\mathbb{Q}(\sqrt{\Delta})$ and ${kl("optimal_embedding", "optimal embeddings")} of discriminant $\Delta$ into $R(N)$ exist ${cite("voi21")}.`,
    body: String.raw`<p>The Hecke data is a list of pairs $(\ell, P)$, a polynomial $P$ in the Hecke operator at $\ell$, considered for the ${kl("killer", "Hecke killer")}; the killer actually used by each exported run is recorded with the run. The candidate also requires the Eichler orders $R(N)$ and $R(pN)$ and the lists of embeddings of each admissible discriminant.</p>`,
    see: ["triplet", "killer", "sarith_group", "discriminants"], source: "datasets/Precomputed_data/candidates.json; Scripts/candidate_generation.py; darmonpoints/darmonvonk.py (admissible_discriminants)",
    reviewed: false,
  },
  optimal_embedding: {
    cat: "precomputed", title: "Optimal embeddings",
    short: String.raw`An embedding $\psi \colon K \hookrightarrow B$ of a real quadratic field is $(\mathcal{O}, R(N))$-optimal, for an order $\mathcal{O} \subseteq \mathcal{O}_K$, when $\psi^{-1}(R(N)) = \mathcal{O}$; $\mathcal{E}(\mathcal{O}, R(N))$ is the set of them ${cite("gon26", "§3.1")}. The precomputed data lists representatives of $\Gamma_0(N) \backslash \mathcal{E}(\mathcal{O}, R(N))$ (conjugacy by norm-one units of $R(N)$), computed with ${cite("qq")}; each is given by the image of $(\delta + \sqrt{\Delta})/2$ in the coordinates $1, i, j, k$. Their positions are the ${kl("embeddings", "indices $i$, $j$")} of the J values.`,
    see: ["embeddings", "sc_label", "eichler_order"], source: "datasets/Precomputed_data/embeddings.json",
    reviewed: false,
  },
  fuchsian_group: {
    cat: "precomputed", title: "Fuchsian group of an order",
    short: String.raw`The group $\iota_\infty(\Gamma_0(M))/\{\pm 1\}$, $\Gamma_0(M) = R(M)^\times_1$ the norm-one units of an ${kl("eichler_order", "Eichler order")}, acting on the upper half plane $\mathcal{H}$; for a triplet, $M = N$ and $M = pN$. It is stored exactly: generators (quaternions), relation words, a fundamental domain and the splitting $\iota_\infty$ at infinity, computed with ${cite("magma")}. The abelian invariants of $\Gamma_0(M)^{\mathrm{ab}}$ are stored as a check. The data rebuild the group without Magma.`,
    see: ["sarith_group", "eichler_order", "killer"], source: "darmonpoints-dev/darmonpoints/arithgroup_io.py",
    reviewed: false,
  },
  sarith_group: {
    cat: "precomputed", title: "Group data of a triplet",
    short: String.raw`Everything the computation of a ${kl("triplet", "triplet")} needs about its groups, stored exactly: the ${kl("fuchsian_group", "Fuchsian groups")} $\Gamma_0(N)$ and $\Gamma_0(pN)$, the Atkin–Lehner element $w_p \in R(pN)$, the coset representatives used for $U_p$ ${cite("gon26", "Def. 3.25–3.26")}, and the $p$-adic splitting $\iota_p$ to a finite precision. ${cite("dp")} calls this an S-arithmetic group: it determines the $p$-arithmetic group $R(N)[1/p]^\times_1$ used by ${cite("dv21")}, although the construction itself only uses $\Gamma_0(N)$ and $\Gamma_0(pN)$.`,
    see: ["fuchsian_group", "triplet"], source: "darmonpoints-dev/darmonpoints/arithgroup_io.py",
    reviewed: false,
  },

  // USING THE DATA
  label: {
    cat: "usage", title: "Labels of values",
    short: String.raw`A ${kl("jvalue", "J value")} is labelled $p.D.N\text{-}D_{co}.D_{cy}\text{-}i.j\text{-}\mathrm{parity}$, e.g. <code>5.6.1-8.53-0.3-Je</code>: the ${kl("triplet", "triplet")}, the two ${kl("discriminants", "discriminants")}, the two ${kl("embeddings", "embedding indices")} and the ${kl("parity", "parity")} (Jp, Jm, Je, Jo). The label is the address of its page.`,
    see: ["triplet", "discriminants", "embeddings", "parity"], source: "SCHEMA.md",
    reviewed: false,
  },
  sage: {
    cat: "usage", title: "Sage code",
    short: String.raw`Every value has one line of ${cite("sage")} code that defines the ${kl("padic_field", "$p$-adic field")} $K_p$ (variable <code>K</code>, generator <code>g</code>), the value $J$ exactly to its precision, the ${kl("H", "field $H$")} and the ${kl("lindep", "lindep")} polynomial $f$, with a comment saying where $f$ vanishes. Every line was run in Sage and gives the stored value.`,
    body: String.raw`<p>On the table: Ctrl+double-click (⌘+double-click) a row copies its line; the checkboxes and “Copy selected as Sage” copy a block defining dictionaries <code>J[label]</code>, <code>f[label]</code> and <code>H[(Dco, Dcy)]</code>. Copying to the clipboard needs https or localhost; otherwise a window shows the text to copy.</p>`,
    see: ["padic_field", "label"], source: "exporter/export_jvalues.py (sage_line); tests/check_export.py",
    reviewed: false,
  },
  provenance: {
    cat: "usage", title: "Data version and provenance",
    short: String.raw`The data come from a versioned dataset repository at a stated commit, exported at a pinned precision per ${kl("triplet", "triplet")}. Each value page lists the files it was read from, the computation run, the ${kl("killer", "Hecke killer")} and the commits of the code. The format is documented in SCHEMA.md.`,
    see: ["sage"], source: "SCHEMA.md; exporter/levels.json",
    reviewed: false,
  },

  // REFERENCES
  ref_gon26: {
    cat: "references", title: "[Gon26] Gonzalo Calbetó",
    short: String.raw`G. Gonzalo Calbetó, <i>Quaternionic $p$-adic singular moduli with a level structure</i>, in preparation. The notation of this site follows it.`,
    see: [], source: "", reviewed: false,
  },
  ref_gmx21: {
    cat: "references", title: "[GMX21] Guitart, Masdeu, Xarles",
    short: String.raw`X. Guitart, M. Masdeu, X. Xarles, <i>A quaternionic construction of $p$-adic singular moduli</i>, Res. Math. Sci. 8 (2021), no. 3, Paper No. 45. <a href="https://doi.org/10.1007/s40687-021-00274-3">doi:10.1007/s40687-021-00274-3</a>`,
    see: [], source: "", reviewed: false,
  },
  ref_dv21: {
    cat: "references", title: "[DV21] Darmon, Vonk",
    short: String.raw`H. Darmon, J. Vonk, <i>Singular moduli for real quadratic fields: a rigid analytic approach</i>, Duke Math. J. 170 (2021), no. 1, 23–93. <a href="https://doi.org/10.1215/00127094-2020-0035">doi:10.1215/00127094-2020-0035</a>`,
    see: [], source: "", reviewed: false,
  },
  ref_gre09: {
    cat: "references", title: "[Gre09] Greenberg",
    short: String.raw`M. Greenberg, <i>Stark–Heegner points and the cohomology of quaternionic Shimura varieties</i>, Duke Math. J. 147 (2009), no. 3, 541–575. <a href="https://doi.org/10.1215/00127094-2009-017">doi:10.1215/00127094-2009-017</a>`,
    see: [], source: "", reviewed: false,
  },
  ref_ric21: {
    cat: "references", title: "[Ric21] Rickards, thesis",
    short: String.raw`J. Rickards, <i>Intersections of closed geodesics on Shimura curves</i>, PhD thesis, McGill University, 2021.`,
    see: [], source: "", reviewed: false,
  },
  ref_voi21: {
    cat: "references", title: "[Voi21] Voight, Quaternion algebras",
    short: String.raw`J. Voight, <i>Quaternion algebras</i>, Graduate Texts in Mathematics 288, Springer, 2021. <a href="https://doi.org/10.1007/978-3-030-56694-4">doi:10.1007/978-3-030-56694-4</a> (open access).`,
    see: [], source: "", reviewed: false,
  },
  ref_qq: {
    cat: "references", title: "Q-Quadratic",
    short: String.raw`J. Rickards, <i>Q-Quadratic</i>, a PARI/GP package for binary quadratic forms and quaternion algebras over $\mathbb{Q}$: <a href="https://github.com/JamesRickards-Canada/Q-Quadratic">github.com/JamesRickards-Canada/Q-Quadratic</a>. Its functions (<code>qa_embed</code>, <code>bqf_ncgp_lexic</code>, …) are documented in the <a href="${QQ_GUIDE}">GP guide</a>.`,
    see: [], source: "", reviewed: false,
  },
  ref_dp: {
    cat: "references", title: "darmonpoints",
    short: String.raw`M. Masdeu, <i>darmonpoints</i>, a SageMath package for Darmon points and Darmon–Vonk cocycles: <a href="https://github.com/mmasdeu/darmonpoints">github.com/mmasdeu/darmonpoints</a>. The computations use an extended version of it.`,
    see: [], source: "", reviewed: false,
  },
  ref_pari: {
    cat: "references", title: "PARI/GP",
    short: String.raw`The PARI Group, <i>PARI/GP</i>: <a href="https://pari.math.u-bordeaux.fr/">pari.math.u-bordeaux.fr</a>. The functions used (<code>polredbest</code>, <code>polredabs</code>, <code>nfisincl</code>, <code>nfisisom</code>, <code>bnrclassfield</code>, <code>polcompositum</code>) are documented in its <a href="https://pari.math.u-bordeaux.fr/dochtml/html/">user's guide</a>.`,
    see: [], source: "", reviewed: false,
  },
  ref_magma: {
    cat: "references", title: "Magma",
    short: String.raw`W. Bosma, J. Cannon, C. Playoust, <i>The Magma algebra system I: the user language</i>, J. Symbolic Comput. 24 (1997), 235–265. <a href="https://doi.org/10.1006/jsco.1996.0125">doi:10.1006/jsco.1996.0125</a>`,
    see: [], source: "", reviewed: false,
  },
  ref_sage: {
    cat: "references", title: "SageMath",
    short: String.raw`The Sage Developers, <i>SageMath</i>: <a href="https://www.sagemath.org">sagemath.org</a>.`,
    see: [], source: "", reviewed: false,
  },
};
