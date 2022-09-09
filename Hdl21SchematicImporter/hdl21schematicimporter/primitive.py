"""
# Primitives 

The instantiable primitive elements of a schematic.
"""

from enum import Enum, auto
from dataclasses import dataclass, field
from typing import List

# Local imports
from .point import Point


class PrimitiveKind(Enum):
    """# Enumerated Primitive Types"""

    NMOS = auto()
    PMOS = auto()
    INPUT = auto()
    OUTPUT = auto()
    INOUT = auto()


@dataclass
class PrimitivePort:
    name: str
    loc: Point


@dataclass
class Primitive:
    kind: PrimitiveKind
    ports: List[PrimitivePort] = field(default_factory=list)


# Create the mapping from `PrimitiveKind` to `Primitive`s
primitives = {
    PrimitiveKind.NMOS: Primitive(
        kind=PrimitiveKind.NMOS,
        ports=[
            PrimitivePort(name="d", loc=Point(0, 0)),
            PrimitivePort(name="g", loc=Point(70, 40)),
            PrimitivePort(name="s", loc=Point(0, 80)),
            PrimitivePort(name="b", loc=Point(-20, 40)),
        ],
    ),
    PrimitiveKind.PMOS: Primitive(
        kind=PrimitiveKind.PMOS,
        ports=[
            PrimitivePort(name="d", loc=Point(0, 80)),
            PrimitivePort(name="g", loc=Point(70, 40)),
            PrimitivePort(name="s", loc=Point(0, 0)),
            PrimitivePort(name="b", loc=Point(-20, 40)),
        ],
    ),
    PrimitiveKind.INPUT: Primitive(
        kind=PrimitiveKind.INPUT,
        ports=[
            PrimitivePort(name="FIXME", loc=Point(50, 10)),
        ],
    ),
    PrimitiveKind.OUTPUT: Primitive(
        kind=PrimitiveKind.OUTPUT,
        ports=[
            PrimitivePort(name="FIXME", loc=Point(-20, 10)),
        ],
    ),
    PrimitiveKind.INOUT: Primitive(
        kind=PrimitiveKind.INOUT,
        ports=[
            PrimitivePort(name="FIXME", loc=Point(-20, 10)),
        ],
    ),
}
