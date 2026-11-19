"""Find placeholder / tautological JSDoc comments and undocumented public members in a TS source tree.

Usage: python -I find_empty_docs.py <src_dir> <out_csv>
"""
import csv
import os
import re
import sys
from collections import Counter, defaultdict

SRC, OUT = sys.argv[1], sys.argv[2]

DOC_RE = re.compile(r"/\*\*(.*?)\*/\s*\n(\s*)([^\n]*)", re.S)
CLASS_RE = re.compile(r"^\s*export\s+(?:default\s+)?(?:abstract\s+)?class\s+(\w+)")
MEMBER_RE = re.compile(
    r"^\s*(?:(?:public|protected|private|static|readonly|abstract|override|async|get|set)\s+)*"
    r"(#?\w+)\s*[(<:=?!]"
)
STOP = {"the", "a", "an", "this", "of", "to", "is", "for", "and", "or", "whether", "returns", "return",
        "sets", "set", "gets", "get", "provides", "behavior", "handles", "handle", "current", "new",
        "value", "member", "public", "condition", "active", "widget", "object", "instance", "creates",
        "event", "implements", "s", "it", "its", "on", "be", "has", "with", "clears", "shows", "hides",
        "called", "true", "false", "if", "when", "in", "given", "specified", "property", "flag"}

PATTERNS = [
    ("provides-behavior", re.compile(r"^Provides [\w\s-]+ behavior\.?$", re.I)),
    ("handles-behavior", re.compile(r"^Handles [\w\s-]+ behavior\.?$", re.I)),
    ("public-member", re.compile(r"^Public [\w\s-]+ member\.?$", re.I)),
    ("implements-widget", re.compile(r"^Implements the [\w\s-]+\.?$", re.I)),
    ("creates-instance", re.compile(r"^Creates a new instance\.?$", re.I)),
    ("condition-active", re.compile(r"^Returns whether the [\w\s-]+ condition is active\.?$", re.I)),
    ("internal-only", re.compile(r"^@internal\s*$", re.I)),
]


def words(s):
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", s)
    return {w.lower() for w in re.findall(r"[A-Za-z]+", s)}


def clean(doc):
    lines = [re.sub(r"^\s*\*\s?", "", l).strip() for l in doc.strip().splitlines()]
    text = " ".join(l for l in lines if l and not l.startswith("@param") and not l.startswith("@returns"))
    return text.strip()


rows = []
undocumented = []
for root, _, files in os.walk(SRC):
    for fn in files:
        if not fn.endswith(".ts") or fn.endswith(".d.ts"):
            continue
        path = os.path.join(root, fn)
        rel = os.path.relpath(path, SRC).replace("\\", "/")
        text = open(path, encoding="utf-8").read()

        # documented declarations
        for m in DOC_RE.finditer(text):
            doc, decl = clean(m.group(1)), m.group(3)
            line = text.count("\n", 0, m.start(3)) + 1
            cm = CLASS_RE.match(decl)
            mm = MEMBER_RE.match(decl)
            name = cm.group(1) if cm else (mm.group(1) if mm else None)
            if name is None:
                continue
            cat = None
            for c, rx in PATTERNS:
                if rx.match(doc):
                    cat = c
                    break
            if cat is None and doc and not doc.startswith("@"):
                content = words(doc) - STOP - words(name)
                if not content and len(doc.split()) <= 8:
                    cat = "tautology"
            if cat == "internal-only" and decl.lstrip().startswith(("private", "#")):
                cat = None
            if cat:
                rows.append((rel, line, "class" if cm else "member", name, cat, doc))

        # undocumented public members inside exported classes (rough, brace-depth based)
        lines = text.splitlines()
        depth = 0
        parens = 0
        cls_depth = None
        prev_nonblank = ""
        for i, l in enumerate(lines, 1):
            stripped = l.strip()
            if cls_depth is None and CLASS_RE.match(l):
                cls_depth = depth
            elif cls_depth is not None and depth == cls_depth + 1 and parens == 0:
                mm = MEMBER_RE.match(l)
                if (mm and not stripped.startswith(("private", "#", "//", "return", "if", "for", "while"))
                        and not re.match(r"^(static\s+)?#", stripped)
                        and not re.search(r"\boverride\b", stripped.split("(")[0])
                        and not mm.group(1).startswith(("_", "#"))
                        and not prev_nonblank.endswith("*/")
                        and not prev_nonblank.startswith("@")):
                    undocumented.append((rel, i, mm.group(1), stripped[:90]))
            depth += l.count("{") - l.count("}")
            parens = max(0, parens + l.count("(") - l.count(")"))
            if cls_depth is not None and depth <= cls_depth:
                cls_depth = None
            if stripped:
                prev_nonblank = stripped

with open(OUT, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["file", "line", "kind", "name", "category", "doc"])
    w.writerows(sorted(rows))
with open(OUT.replace(".csv", "_undocumented.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["file", "line", "name", "declaration"])
    w.writerows(sorted(undocumented))

print("placeholder/tautological docs:", len(rows))
for c, n in Counter(r[4] for r in rows).most_common():
    print(f"  {c:20} {n}")
print("undocumented public members:", len(undocumented))
per = defaultdict(int)
for r in rows:
    per[r[0]] += 1
for r in undocumented:
    per[r[0]] += 1
print("top files (placeholder + undocumented):")
for f_, n in sorted(per.items(), key=lambda x: -x[1])[:15]:
    print(f"  {n:4}  {f_}")
