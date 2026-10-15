#!/usr/bin/env python3
"""Validate all Podcast Youci course files using only Python's standard library."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSES = ROOT / "courses"
TIME_RE = re.compile(r"^(\d+):([0-5]\d)$")


def seconds(value: object, where: str, errors: list[str]) -> int | None:
    if not isinstance(value, str) or not (match := TIME_RE.fullmatch(value)):
        errors.append(f"{where}: expected MM:SS time, got {value!r}")
        return None
    return int(match.group(1)) * 60 + int(match.group(2))


def require_text(item: dict, fields: tuple[str, ...], where: str, errors: list[str]) -> None:
    for field in fields:
        if not isinstance(item.get(field), str) or not item[field].strip():
            errors.append(f"{where}.{field}: required non-empty string")


def validate(path: Path) -> list[str]:
    errors: list[str] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        return [f"{path}: invalid UTF-8 JSON: {exc}"]
    if not isinstance(data, dict):
        return [f"{path}: top level must be an object"]

    meta = data.get("meta")
    if not isinstance(meta, dict):
        errors.append("meta: required object")
    else:
        require_text(meta, ("episodeId", "title", "verified"), "meta", errors)
        if meta.get("episodeId") != path.stem:
            errors.append(f"meta.episodeId must match filename {path.stem!r}")

    units = data.get("units")
    if not isinstance(units, list) or not units:
        errors.append("units: required non-empty array")
        units = []
    previous_end = None
    for index, unit in enumerate(units):
        where = f"units[{index}]"
        if not isinstance(unit, dict):
            errors.append(f"{where}: expected object")
            continue
        require_text(unit, ("title", "preview", "question"), where, errors)
        start = seconds(unit.get("start"), f"{where}.start", errors)
        end = seconds(unit.get("end"), f"{where}.end", errors)
        if start is not None and end is not None and start >= end:
            errors.append(f"{where}: start must be before end")
        if previous_end is not None and start is not None and start < previous_end:
            errors.append(f"{where}: overlaps the previous unit")
        if end is not None:
            previous_end = end

    collection_fields = {
        "vocab": ("word", "cn", "definition", "tip"),
        "expressions": ("time", "text", "cn", "definition", "example"),
    }
    for name, required in collection_fields.items():
        records = data.get(name)
        if not isinstance(records, list) or not records:
            errors.append(f"{name}: required non-empty array")
            continue
        for index, record in enumerate(records):
            where = f"{name}[{index}]"
            if not isinstance(record, dict):
                errors.append(f"{where}: expected object")
                continue
            require_text(record, required, where, errors)
            if "time" in record:
                seconds(record["time"], f"{where}.time", errors)
            if "unit" in record and (not isinstance(record["unit"], int) or not 0 <= record["unit"] < len(units)):
                errors.append(f"{where}.unit: out of range")
            if "example_source" in record and record["example_source"] not in {"adapted", "transcript"}:
                errors.append(f"{where}.example_source: expected 'adapted' or 'transcript'")
            if "transcript_verified" in record and not isinstance(record["transcript_verified"], bool):
                errors.append(f"{where}.transcript_verified: expected boolean")

    patterns = data.get("patterns")
    if not isinstance(patterns, list) or not patterns:
        errors.append("patterns: required non-empty array")
    else:
        for group_index, group in enumerate(patterns):
            if not isinstance(group, list) or not group:
                errors.append(f"patterns[{group_index}]: expected non-empty array")
                continue
            for item_index, item in enumerate(group):
                where = f"patterns[{group_index}][{item_index}]"
                if not isinstance(item, dict):
                    errors.append(f"{where}: expected object")
                    continue
                require_text(item, ("text", "cn", "example", "prompt"), where, errors)

    ids: dict[str, str] = {}
    for name in ("units", "vocab", "expressions", "supplemental"):
        records = data.get(name, [])
        if not isinstance(records, list):
            continue
        for index, record in enumerate(records):
            if isinstance(record, dict) and "id" in record:
                value = str(record["id"])
                where = f"{name}[{index}].id"
                if value in ids:
                    errors.append(f"{where}: duplicate ID also used at {ids[value]}")
                else:
                    ids[value] = where
    return errors


def main() -> int:
    files = sorted(COURSES.glob("*.json"))
    if not files:
        print("No course JSON files found", file=sys.stderr)
        return 1
    failed = False
    for path in files:
        errors = validate(path)
        if errors:
            failed = True
            print(f"FAIL {path.relative_to(ROOT)}")
            for error in errors:
                print(f"  - {error}")
        else:
            print(f"OK   {path.relative_to(ROOT)}")
    return int(failed)


if __name__ == "__main__":
    raise SystemExit(main())
