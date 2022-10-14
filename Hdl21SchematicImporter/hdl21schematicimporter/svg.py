""" 
# SVG Importer

SVG format parsing and reading of string-valued `Circuit` content. 
"""

import json
from os import PathLike
from pathlib import Path
from enum import Enum
from xml.etree.ElementTree import parse, Element
from typing import Optional

# Local imports
from .circuit import Circuit
from .svgdefs import SchSvgIds, SchSvgClasses


class SvgTags(Enum):
    """Enumerated SVG Node-Type Tags"""

    DEFS = "defs"
    GROUP = "g"
    STYLE = "style"
    RECT = "rect"
    TEXT = "text"

    @staticmethod
    def from_etree_tag(etree_tag: str) -> Optional["SvgTags"]:
        """Converts an etree tag to a SvgTags enum value"""
        if not etree_tag.startswith("{http://www.w3.org/2000/svg}"):
            return None
        # Remove the namespace prefix, and convert to an `SvgTags` enum value
        return SvgTags(etree_tag[len("{http://www.w3.org/2000/svg}") :])

    @staticmethod
    def from_element(element: Element) -> Optional["SvgTags"]:
        return SvgTags.from_etree_tag(element.tag)


class SvgImporter:
    """
    # SvgImporter
    Uses the standard library's XML module to parse SVG syntax, until finding an element containing a `Circuit`.
    """

    def __init__(self, svg_file: PathLike):
        self.svg_file: Path = Path(svg_file)
        self.root: Optional[Element] = None

    def import_svg_file(self) -> str:
        """Import a the JSON-encoded Circuit string from an SVG file."""

        # Parse the SVG content
        self.root = parse(self.svg_file).getroot()

        # Examine each child element, looking for the `circuit-defs`.
        # Note this *does not* search hierarchically, only the top-level SVG element's children.
        for element in self.root:
            if self.is_this_schematic_defs(element):
                return self.import_schematic_defs(element)

        # Not found; error time.
        return self.fail(f"No {SchSvgClasses.DEFS} found in {self.svg_file}")

    def is_this_schematic_defs(self, element: Element) -> bool:
        """Boolean indication of whether `element` is the `circuit-defs` element."""

        svgtag = SvgTags.from_element(element)
        if svgtag is None or svgtag != SvgTags.DEFS:
            return False

        # We have a `defs` element. Check its `id`.
        elem_id = element.attrib.get(f"id", None)
        return elem_id is not None and elem_id == SchSvgIds.DEFS.value

    def import_schematic_defs(self, defs: Element) -> str:
        """Import the string circuit content from its `defs` element."""

        # The circuit-defs thus far contain a single text element.
        # Look at any extras nonetheless, and return the string of the first class-matching element.
        for elem in defs:
            if self.is_this_the_circuit(elem):
                return self.make_circuit(elem.text)

        # Not found; error time.
        return self.fail(f"No {SchSvgClasses.CIRCUIT} found in {defs}")

    def is_this_the_circuit(self, elem: Element) -> bool:
        """Boolean indication of whether `elem` is the `circuit` element."""

        if SvgTags.from_element(elem) != SvgTags.TEXT:
            return False

        # We have a `text` element. Check its `id`.
        elem_id = elem.attrib.get(f"id", None)
        return elem_id is not None and elem_id == SchSvgIds.CIRCUIT.value

    def make_circuit(self, json_str: str) -> Circuit:
        """Create a `Circuit` from JSON-encoded text"""

        try:  # The main event: parse the JSON
            circuit = Circuit(**json.loads(json_str))
        except:
            return self.fail(f"Invalid Circuit, could not be parsed from {json_str}")

        # If the circuit has no name, use the file name prefix
        if not circuit.name:
            circuit.name = self.svg_file.name.split(".")[0]
        return circuit

    def fail(self, msg: str):
        """Error helper"""
        raise RuntimeError(msg)


def svg_to_circuit(svg_file: PathLike) -> Circuit:
    """Import a schematic from an SVG file."""
    return SvgImporter(svg_file).import_svg_file()


__all__ = ["svg_to_circuit"]
