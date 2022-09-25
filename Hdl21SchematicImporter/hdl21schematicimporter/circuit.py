""" 
# Circuit

Circuits data model extracted from schematics. 

Circuit data is often parsed from JSON-encoded text embedded in an SVG schematic. 
Thus it is crucial that the data model here matches that of the editor tool.
"""

from typing import List
from enum import Enum
from pydantic.dataclasses import dataclass


class PortDir(Enum):
    """Schematic Signal/ Port Direction
    Including the `INTERNAL` variant for internal Signals"""

    INTERNAL = "INTERNAL"
    INPUT = "INPUT"
    OUTPUT = "OUTPUT"
    INOUT = "INOUT"


@dataclass
class Signal:
    name: str
    portdir: PortDir


@dataclass
class Connection:
    portname: str
    signame: str


@dataclass
class Instance:
    """Circuit Instance"""

    name: str  # Instance Name
    of: str  # Instance-Of Code-String
    conns: List[Connection]  # Connections


@dataclass
class Circuit:
    name: str
    prelude: str
    signals: List[Signal]
    instances: List[Instance]
