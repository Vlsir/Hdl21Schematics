"""
# Primitives 

The instantiable primitive elements of a schematic.
"""

import re
from os import PathLike
from enum import Enum, auto
from dataclasses import dataclass, field
from xml.etree.ElementTree import parse, Element
from typing import Dict, Tuple, List, Optional

# Local imports
from .point import Point


class PrimitiveEnum(Enum):
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
    enumval: PrimitiveEnum
    ports: List[PrimitivePort] = field(default_factory=list)


# Create the mapping from `PrimitiveEnum` to `Primitive`s
primitives = {
    PrimitiveEnum.NMOS: Primitive(
        enumval=PrimitiveEnum.NMOS,
        ports=[
            PrimitivePort(name="d", loc=Point(0, 0)),
            PrimitivePort(name="g", loc=Point(70, 40)),
            PrimitivePort(name="s", loc=Point(0, 80)),
            PrimitivePort(name="b", loc=Point(-20, 40)),
        ],
    ),
    PrimitiveEnum.PMOS: Primitive(
        enumval=PrimitiveEnum.PMOS,
        ports=[
            PrimitivePort(name="d", loc=Point(0, 80)),
            PrimitivePort(name="g", loc=Point(70, 40)),
            PrimitivePort(name="s", loc=Point(0, 0)),
            PrimitivePort(name="b", loc=Point(-20, 40)),
        ],
    ),
    PrimitiveEnum.INPUT: Primitive(
        enumval=PrimitiveEnum.INPUT,
        ports=[
            PrimitivePort(name="FIXME", loc=Point(50, 10)),
        ],
    ),
    PrimitiveEnum.OUTPUT: Primitive(
        enumval=PrimitiveEnum.OUTPUT,
        ports=[
            PrimitivePort(name="FIXME", loc=Point(-20, 10)),
        ],
    ),
    PrimitiveEnum.INOUT: Primitive(
        enumval=PrimitiveEnum.INOUT,
        ports=[
            PrimitivePort(name="FIXME", loc=Point(-20, 10)),
        ],
    ),
}
