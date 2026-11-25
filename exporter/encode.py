"""Encoding of Sage objects as plain JSON values, and the Sage snippets that rebuild them.

Conventions (see SCHEMA.md, "Encodings"):

- **p-adic numbers** of an unramified extension K = Q_p(g) with K = Qp(p, cap).extension(f):
  ``{"v": v, "prec": N, "u": ["u_0", ..., "u_{k-1}"]}`` means

      J = p^v * (u_0 + u_1 g + ... + u_{k-1} g^{k-1}) + O(p^N),

  where the u_i are integers in [0, p^(N - v)) written in decimal, k = [K : Q_p], and the unit part
  u_0 + u_1 g + ... has valuation 0. Zero is ``{"zero": true, "prec": N}``.
- **polynomials** over Q: the string ``str()`` of the polynomial in the variable ``x`` (Sage syntax, ``^`` for powers).
- **rationals**: strings ``"a/b"`` or ``"a"``; Python integers stay JSON integers when small (|n| < 2^53),
  and become strings otherwise.
"""

from __future__ import annotations

from sage.all import QQ, ZZ, Integer, Rational, PolynomialRing

QX = PolynomialRing(QQ, "x")
_SAFE = 2 ** 53


def rational(c) -> str | int:
    """An integer or rational: a JSON integer when it is a small integer, a string otherwise."""
    c = QQ(c)
    if c.denominator() == 1 and abs(c) < _SAFE:
        return int(c)
    return str(c)


def poly(f) -> str | None:
    """A polynomial over Q (any variable name, any base ring coercible to Q) as a string in x."""
    if f is None:
        return None
    return str(QX([QQ(c) for c in f.list()]))


def padic(J) -> dict:
    """An element of an unramified extension Qp(p, cap).extension(f), as ``{"v", "prec", "u"}``."""
    K = J.parent()
    p = ZZ(K.prime())
    N = int(J.precision_absolute())
    if J.is_zero():
        return {"zero": True, "prec": N}
    v = int(J.valuation())
    unit = J / K(p) ** v
    coeffs = [QQ(c) for c in unit.polynomial().list()]
    k = K.degree()
    coeffs += [QQ(0)] * (k - len(coeffs))
    modulus = p ** (N - v)
    u = []
    for c in coeffs:
        if c.denominator() % p == 0:
            raise ValueError(f"unit part has a non-integral coefficient {c}")
        u.append(str(ZZ(c.numerator() * c.denominator().inverse_mod(modulus)) % modulus))
    return {"v": v, "prec": N, "u": u}


def padic_field(K) -> dict:
    """The p-adic field of the values: ``{"p", "cap", "modulus", "gen"}`` (the defining polynomial in x, exact)."""
    return {"p": int(K.prime()), "cap": int(K.precision_cap()), "modulus": poly(K.defining_polynomial(exact=True)),
            "gen": "g"}


def sage_field_line(field: dict) -> str:
    """The Sage statements defining x and K = Q_p(g) of ``field`` (as :func:`padic_field` encodes it)."""
    return f"R.<x> = QQ[]; K.<g> = Qp({field['p']}, {field['cap']}).extension({field['modulus']})"


def sage_padic_expr(value: dict, p: int) -> str:
    """A Sage expression (in K and g) for an encoded p-adic number."""
    if value.get("zero"):
        return f"K(0).add_bigoh({value['prec']})"
    terms = []
    for i, c in enumerate(value["u"]):
        if c == "0":
            continue
        terms.append(c if i == 0 else (f"{c}*g" if i == 1 else f"{c}*g^{i}"))
    unit = " + ".join(terms) if terms else "0"
    rel = value["prec"] - value["v"]
    return f"{p}^({value['v']})*K({unit}).add_bigoh({rel})" if value["v"] else f"K({unit}).add_bigoh({rel})"


def jsonable(obj):
    """Recursively convert stored metadata (tuples, Sage integers and rationals, polynomials) to JSON values."""
    if obj is None or isinstance(obj, (bool, str)):
        return obj
    if isinstance(obj, int):
        return obj if abs(obj) < _SAFE else str(obj)
    if isinstance(obj, float):
        return obj
    if isinstance(obj, (Integer, Rational)):
        return rational(obj)
    if isinstance(obj, dict):
        return {(k if isinstance(k, str) else str(k)): jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [jsonable(v) for v in obj]
    if hasattr(obj, "is_unit") and hasattr(obj, "list") and hasattr(obj, "degree"):  # a polynomial
        try:
            return poly(obj)
        except Exception:
            pass
    try:
        return rational(obj)
    except Exception:
        return str(obj)
