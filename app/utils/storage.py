"""
KidLearn AI — JSON File Storage Utility
────────────────────────────────────────
Simple helpers to read and write JSON files.
Used for persisting user profiles and progress data.
"""

import json
import os
from typing import Any


def read_json(file_path: str) -> dict:
    """
    Read and return data from a JSON file.
    Returns an empty dict if the file doesn't exist yet.
    """
    if not os.path.exists(file_path):
        return {}
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        # If the file is corrupt or unreadable, start fresh
        return {}


def write_json(file_path: str, data: dict) -> None:
    """
    Write data to a JSON file, creating directories if needed.
    """
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
