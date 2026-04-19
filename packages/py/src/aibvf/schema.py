"""Loads the canonical AI BVF v1.0 JSON Schema bundled with the package."""
import json
from importlib import resources


def load_schema() -> dict:
    """Returns the AI BVF v1.0 JSON Schema as a dict."""
    with resources.files("aibvf.schema").joinpath("bvf-protocol.schema.json").open("r", encoding="utf-8") as fh:
        return json.load(fh)
