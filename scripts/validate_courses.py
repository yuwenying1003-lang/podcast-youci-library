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


def normalize_vocab(value: object) -> str:
    text = str(value or "").strip().casefold()
    text = text.translate(str.maketrans({"‘": "'", "’": "'", "‐": "-", "‑": "-", "‒": "-", "–": "-", "—": "-"}))
    return " ".join(text.split())


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
        if "sourceUrl" in meta and meta["sourceUrl"] != f"https://app.listenleap.com/read?id={path.stem}":
            errors.append("meta.sourceUrl must be the matching ListenLeap episode URL")

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
        "vocab": ("word", "cn", "definition", "example", "tip"),
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
            if "clip" in record:
                clip = record["clip"]
                if not isinstance(clip, dict) or clip.get("verified") is not True:
                    errors.append(f"{where}.clip: exact clips require verified=true")
                else:
                    start = seconds(clip.get("start"), f"{where}.clip.start", errors)
                    end = seconds(clip.get("end"), f"{where}.clip.end", errors)
                    if start is not None and end is not None and (end <= start or end - start > 90):
                        errors.append(f"{where}.clip: end must be after start and within 90 seconds")
                    if not isinstance(clip.get("quote"), str) or not clip["quote"].strip():
                        errors.append(f"{where}.clip.quote: verified source sentence required")

    seen_vocab: dict[tuple[int, str], int] = {}
    for index, record in enumerate(data.get("vocab", [])):
        if not isinstance(record, dict):
            continue
        if isinstance(record.get("unit"), int):
            unit_index = record["unit"]
        else:
            item_time = seconds(record.get("time"), f"vocab[{index}].time", errors)
            unit_index = next((i for i, unit in enumerate(units) if item_time is not None and seconds(unit["start"], f"units[{i}].start", []) <= item_time < seconds(unit["end"], f"units[{i}].end", [])), -1)
        key = (unit_index, normalize_vocab(record.get("word")))
        if key in seen_vocab:
            errors.append(f"vocab[{index}]: duplicate normalized word in unit {unit_index + 1}; first used at vocab[{seen_vocab[key]}]")
        else:
            seen_vocab[key] = index
        if re.search(r"transcript|timestamp|timecode|verified sentence clip", str(record.get("tip", "")), re.I):
            errors.append(f"vocab[{index}].tip: technical source/timestamp status is not a learning tip")

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
