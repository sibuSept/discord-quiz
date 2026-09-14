#!/usr/bin/env python3
"""Even out where the correct answer sits in each question's option list.

Every quiz written so far has arrived with its correct answers bunched into
one or two positions. Quiz 4 was the worst: ten Bs and five Cs, no As and no
Ds, so picking B every time scored 10/15 without reading a question. That is
a pattern-spotting exercise, not a knowledge check.

This rewrites the option ORDER only. No question text, no option wording, and
no change to which option is correct: the same string stays the answer, it
just sits somewhere else in the list. The script asserts that afterwards.

The shuffle is seeded from the quizId, so running it twice gives the same
result and a diff stays reviewable. Comments between questions are left
alone, because entries are edited in place rather than the array regenerated.

    python3 tools/shuffle-options.py quiz-5/index.html
    python3 tools/shuffle-options.py --check quiz-5/index.html
"""

import argparse
import pathlib
import random
import re
import sys

ENTRY = re.compile(
    r'(\{\s*q:\s*")((?:[^"\\]|\\.)*)("\s*,\s*options:\s*\[)(.*?)(\]\s*,\s*answer:\s*)(\d+)(\s*\})',
    re.S,
)
STRING = re.compile(r'"((?:[^"\\]|\\.)*)"')


def options_of(raw):
    """Option source strings, escapes left exactly as written."""
    return STRING.findall(raw)


def balance_targets(n, rng):
    """Positions for the correct answer, as even across 0..3 as n allows."""
    targets = [i % 4 for i in range(n)]
    rng.shuffle(targets)
    return targets


def rewrite(text, seed, apply=True):
    entries = list(ENTRY.finditer(text))
    if not entries:
        sys.exit("no QUESTIONS entries found")

    rng = random.Random(seed)
    targets = balance_targets(len(entries), rng)
    out, cursor, placed = [], 0, []

    for n, m in enumerate(entries):
        head_open, q, head_mid, opts_raw, tail, answer, close = m.groups()
        opts = options_of(opts_raw)
        if len(opts) != 4:
            sys.exit(f"Q{n + 1}: expected 4 options, found {len(opts)}")
        answer = int(answer)

        correct = opts[answer]
        others = [o for i, o in enumerate(opts) if i != answer]
        rng.shuffle(others)

        target = targets[n]
        new_opts = others[:target] + [correct] + others[target:]

        assert new_opts[target] == correct, f"Q{n + 1}: answer moved"
        assert sorted(new_opts) == sorted(opts), f"Q{n + 1}: options changed"
        placed.append(target)

        indent = "\n      "
        body = indent + ("," + indent).join('"%s"' % o for o in new_opts) + "\n    "
        out.append(text[cursor:m.start()])
        out.append(head_open + q + head_mid + body + tail + str(target) + close)
        cursor = m.end()

    out.append(text[cursor:])
    spread = {i: placed.count(i) for i in range(4)}
    return ("".join(out) if apply else text), spread, len(entries)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("--check", action="store_true",
                    help="report the current spread without writing anything")
    args = ap.parse_args()

    for name in args.files:
        path = pathlib.Path(name)
        text = path.read_text(encoding="utf-8")

        quiz_id = re.search(r'quizId:\s*"([^"]+)"', text)
        if not quiz_id:
            sys.exit(f"{name}: no quizId to seed from")
        quiz_id = quiz_id.group(1)

        if args.check:
            answers = [int(m.group(6)) for m in ENTRY.finditer(text)]
            spread = {i: answers.count(i) for i in range(4)}
            worst = max(spread.values()) if answers else 0
            print(f"{name}  [{quiz_id}]  n={len(answers)}  spread={spread}  "
                  f"best guess-one-letter score={worst}/{len(answers)}")
            continue

        new, spread, n = rewrite(text, quiz_id)
        path.write_text(new, encoding="utf-8")
        print(f"{name}  [{quiz_id}]  {n} questions  spread now {spread}")


if __name__ == "__main__":
    main()
