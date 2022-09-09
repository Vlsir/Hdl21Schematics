""" 
# SVG Importer

SVG format parsing and conversion to `Schematic` objects.
"""

import re
from os import PathLike
from pathlib import Path
from enum import Enum
from xml.etree.ElementTree import parse, Element
from typing import Tuple, Optional

# Local imports
from .point import Point
from .primitive import PrimitiveKind
from .schematic import (
    Schematic,
    Instance,
    Wire,
    Orientation,
    OrientationMatrix,
    ManhattanSegment,
    Direction,
    valid_orientation_matrices,
)


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


class SchSvgClasses(Enum):
    """Enumerated SVG Classes used to identify Schematic content"""

    INSTANCE = "hdl21-instance"
    WIRE = "hdl21-wire"
    INSTANCE_NAME = "hdl21-instance-name"
    INSTANCE_OF = "hdl21-instance-of"
    WIRE_NAME = "hdl21-wire-name"

    @classmethod
    def from_svg_class(cls, svg_class: str) -> Optional["SchSvgClasses"]:
        """Returns the variant for the paired SVG class"""
        reverse = {v.value: v for v in cls.__members__.values()}
        return reverse.get(svg_class, None)


primitive_svg_classes = {
    "hdl21::primitives::nmos": PrimitiveKind.NMOS,
    "hdl21::primitives::pmos": PrimitiveKind.PMOS,
    "hdl21::primitives::input": PrimitiveKind.INPUT,
    "hdl21::primitives::output": PrimitiveKind.OUTPUT,
    "hdl21::primitives::inout": PrimitiveKind.INOUT,
}


class SvgImporter:
    """
    # SvgImporter
    Uses the standard library's XML module to parse SVG syntax into the abstract `Schematic` model.
    """

    def __init__(self, svg_file: PathLike):
        self.svg_file = svg_file
        self.root = None
        self.schematic = None
        self.other_svg_elems = list()

    def import_svg_file(self) -> Schematic:
        """Import a schematic from an SVG file."""

        # Parse the SVG content
        path = Path(self.svg_file)
        self.root = parse(path).getroot()

        # Extract a name from the file path
        name = path.name.split(".")[0]

        # Import top-level attributes, including the outline dimensions
        width = self.root.attrib.get(f"width", 1600)
        height = self.root.attrib.get(f"height", 800)

        # Create the schematic
        self.schematic = Schematic(name=name, size=Point(int(width), int(height)))

        # And import all the child elements
        for child in self.root:
            self.import_element(child)

        # Return the resulting schematic
        return self.schematic

    def import_element(self, element: Element):
        """Import a hierarchical element, depending on its tag."""

        svgtag = SvgTags.from_etree_tag(element.tag)

        if svgtag is None:
            self.fail(f"Invalid {element}")

        if svgtag in (SvgTags.DEFS, SvgTags.STYLE, SvgTags.RECT):
            # Add these to the "other" list
            self.other_svg_elems.append(element)

        elif svgtag == SvgTags.GROUP:
            self.import_group(element)

        else:  # Ultimately we'll likely find other stuff to be covered, but for now generate errors.
            self.fail(f"Invalid {element}")

    def import_group(self, group: Element):
        """Import a group element."""

        svg_class = group.attrib.get(f"class", None)
        if svg_class is None:
            self.fail(f"Invalid {group}")

        sch_svg_class = SchSvgClasses.from_svg_class(svg_class)
        if sch_svg_class is None:
            self.other_svg_elems.append(group)
        elif sch_svg_class == SchSvgClasses.INSTANCE:
            self.import_instance(group)
        elif sch_svg_class == SchSvgClasses.WIRE:
            self.import_wire(group)
        else:
            self.other_svg_elems.append(group)

    def import_instance(self, group: Element):
        """Import an `Instance` from an SVG group."""

        # Import its SVG `transform` into a location and orientation
        transform = group.attrib.get(f"transform", None)
        if transform is None:
            self.fail(f"Invalid {group}")
        loc, orientation = self.import_transform(transform)

        # Get its three children: the symbol, instance name, and instance-of string.
        child_list = list(group)
        if len(child_list) != 3:
            self.fail(f"Invalid Instance {group}")
        symbol, name_elem, of_elem = child_list

        # Get the symbol type from the symbol group.
        symbol_class = symbol.attrib.get(f"class", None)
        if symbol_class is None:
            self.fail(f"Invalid Symbol {symbol}")
        kind = primitive_svg_classes.get(symbol_class, None)
        if kind is None:
            self.fail(f"Invalid Symbol {symbol}")

        # Get the instance name
        self.expect(name_elem, tag=SvgTags.TEXT, class_=SchSvgClasses.INSTANCE_NAME)
        name = name_elem.text

        # Get the instance-of string
        self.expect(of_elem, tag=SvgTags.TEXT, class_=SchSvgClasses.INSTANCE_OF)
        of = of_elem.text

        # Create and add the instance
        instance = Instance(
            name=name, of=of, kind=kind, loc=loc, orientation=orientation
        )
        self.schematic.instances.append(instance)

    def import_transform(self, transform) -> Tuple[Point, Orientation]:
        """Import an SVG `transform` to a location `Point` and an `Orientation`."""

        # Start splitting up the `transform` string.
        transform = transform.strip()
        parens = re.compile(r"\(|\)")
        split_parens = parens.split(transform)
        if len(split_parens) != 3 or split_parens[0] != "matrix":
            self.fail(f"Invalid transform: {transform}")

        # Split the numeric section, hopefully into six values
        numbers = split_parens[1]
        numbers = re.compile(r"\,|\s").split(numbers)
        numbers = [int(n) for n in numbers]
        if len(numbers) != 6:
            self.fail(f"Invalid transform: {transform}")

        # Get the (x, y) location
        loc = Point(numbers[4], numbers[5])

        # And sort out orientation from the first four numbers
        matrix = OrientationMatrix(*numbers[0:4])
        if matrix not in valid_orientation_matrices:
            self.fail(f"Invalid transform: {transform}")
        orientation = valid_orientation_matrices[matrix]
        return (loc, orientation)

    def import_wire(self, group: Element):
        """Import a `Wire` from an SVG group."""

        child_list = list(group)
        if len(child_list) != 2:
            self.fail(f"Invalid SVG Wire Group {group}")

        # Get the two children: the path and the wire name
        path_elem, name_elem = child_list

        # Get the points from the path element.
        path_data = path_elem.attrib.get("d", None)
        if path_data is None:
            self.fail(f"Invalid Path {path_elem}")
        path_data = path_data.split()
        if path_data[0] != "M":
            self.fail(f"Wire {group} has invalid path data")

        points = []
        for i in range(1, len(path_data), 3):
            x = int(path_data[i])
            y = int(path_data[i + 1])
            points.append(Point(x, y))

        # Extract Manhattan segments from those Points
        segments = []
        pt = points[0]
        for nxt in points[1:]:
            if pt.x == nxt.x:
                start = min(pt.y, nxt.y)
                end = max(pt.y, nxt.y)
                seg = ManhattanSegment(
                    dir_=Direction.VERT, at=pt.x, start=start, end=end
                )
            elif pt.y == nxt.y:
                start = min(pt.x, nxt.x)
                end = max(pt.x, nxt.x)
                seg = ManhattanSegment(
                    dir_=Direction.HORIZ, at=pt.y, start=start, end=end
                )
            else:
                self.fail(f"Wire {group} has non-Manhattan path data")
            segments.append(seg)
            pt = nxt

        # Get the wire name
        self.expect(name_elem, tag=SvgTags.TEXT, class_=SchSvgClasses.WIRE_NAME)
        name = name_elem.text

        # Create and add the wire
        wire = Wire(name=name, points=points, segments=segments)
        self.schematic.wires.append(wire)

    def expect(self, elem: Element, tag: SvgTags, class_: SchSvgClasses):
        """Check that an SVG element has the expected tag and class."""

        if SvgTags.from_etree_tag(elem.tag) != tag:
            self.fail(f"Invalid {elem}")

        classname = elem.attrib.get(f"class", None)
        if classname is None:
            self.fail(f"Invalid {elem}")
        if SchSvgClasses.from_svg_class(classname) != class_:
            self.fail(f"Invalid SVG class for {elem}")

    def fail(self, msg: str):
        """Error helper"""
        raise RuntimeError(msg)


def import_svg(svg_file):
    """Import a schematic from an SVG file."""
    return SvgImporter(svg_file).import_svg_file()
