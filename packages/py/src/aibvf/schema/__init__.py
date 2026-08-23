"""Load the canonical AI BVF v1.0 JSON Schema bundled with the package."""

import json
from importlib import resources


def load_schema() -> dict:
    """Return the AI BVF v1.0 JSON Schema as a dictionary."""
    schema_path = resources.files(__package__).joinpath("bvf-protocol.schema.json")
    with schema_path.open("r", encoding="utf-8") as schema_file:
        return json.load(schema_file)
