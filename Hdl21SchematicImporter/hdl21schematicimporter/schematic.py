""" 
# The Schematic Model 

Content of `Schematic`s, independent of SVG formatting.
"""

from enum import Enum, auto
from dataclasses import dataclass, field
from typing import Dict, List

# Local imports
from .point import Point
from .primitive import PrimitiveKind


class Rotation(Enum):
    """Enumerated 90 Degree Rotations"""

    R0 = "R0"
    R90 = "R90"
    R180 = "R180"
    R270 = "R270"


@dataclass(frozen=True)
class Orientation:
    """# Orientation
    Including reflection & rotation.
    Reflection is about the x-axis (vertical), and is applied *before* rotation."""

    reflected: bool  # Vertical reflection across the x axis, before rotation
    rotation: Rotation  # 90 degree rotation


@dataclass(frozen=True)
class OrientationMatrix:
    """
    # Orientation Matrix

    2x2 matrix representation of an `Orientation`
    Largely corresponds to the values placed in SVG `matrix` attributes.
    SVG matrices are ordered "column major", i.e. `matrix (a, b, c, d, x, y)` corresponds to
    | a c |
    | b d |
    The fields of `OrientationMatrix` are named similarly.
    """

    a: float
    b: float
    c: float
    d: float

    @staticmethod
    def from_orientation(orientation: Orientation) -> "OrientationMatrix":
        """Returns the `OrientationMatrix` for the given `Orientation`"""
        global valid_orientation_matrices
        reverse_orientation_matrices = {
            v: k for k, v in valid_orientation_matrices.items()
        }
        return reverse_orientation_matrices[orientation]


# There are a total of eight valid values of the orientation matrix.
# Check each, and if we have anything else, fail.
# SVG matrices are ordered "column major", i.e. `matrix (a, b, c, d, x, y)` corresponds to
# | a c |
# | b d |
valid_orientation_matrices: Dict[OrientationMatrix, Orientation] = {
    OrientationMatrix(1, 0, 0, 1): Orientation(False, Rotation.R0),
    OrientationMatrix(0, 1, -1, 0): Orientation(False, Rotation.R90),
    OrientationMatrix(-1, 0, 0, -1): Orientation(False, Rotation.R180),
    OrientationMatrix(0, -1, 1, 0): Orientation(False, Rotation.R270),
    OrientationMatrix(1, 0, 0, -1): Orientation(True, Rotation.R0),
    OrientationMatrix(0, 1, 1, 0): Orientation(True, Rotation.R90),
    OrientationMatrix(-1, 0, 0, 1): Orientation(True, Rotation.R180),
    OrientationMatrix(0, -1, -1, 0): Orientation(True, Rotation.R270),
}


@dataclass
class Instance:
    """# Schematic Instance"""

    name: str
    of: str
    kind: PrimitiveKind
    loc: Point
    orientation: Orientation


class Direction(Enum):
    HORIZ = auto()
    VERT = auto()


@dataclass
class ManhattanSegment:
    """
    # Manhattan Wire Segment
    Runs either horizontally or vertically in direction `dir_`,
    at a constant coordinate `at` and between `start` and `end`.
    """

    dir_: Direction
    at: int
    start: int
    end: int

    def intersects(self, pt: Point) -> bool:
        """Boolean indication of whether `pt` intersects this segment."""
        if self.dir_ == Direction.HORIZ:
            return self.at == pt.y and self.start <= pt.x <= self.end
        # Vertical segment
        return self.at == pt.x and self.start <= pt.y <= self.end


@dataclass
class Wire:
    """# Wire
    Principally comprised of an SVG-path-like list of `Point` and a net-`name` annotation.
    Manhattan segments are also stored for faster intersection testing."""

    name: str
    points: List[Point]
    segments: List[ManhattanSegment]

    def intersects(self, pt: Point) -> bool:
        """Boolean indication of whether `pt` intersects any of this wire's Segments."""
        return any(seg.intersects(pt) for seg in self.segments)


@dataclass
class Schematic:
    name: str
    size: Point
    instances: List[Instance] = field(default_factory=list)
    wires: List[Wire] = field(default_factory=list)
    # FIXME! Ports
    # FIXME! Prelude
