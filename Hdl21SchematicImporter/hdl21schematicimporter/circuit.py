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
    """# Signal/ Port Direction
    Including the `INTERNAL` variant for internal Signals"""

    INTERNAL = "INTERNAL"
    INPUT = "INPUT"
    OUTPUT = "OUTPUT"
    INOUT = "INOUT"


@dataclass
class Signal:
    """# Circuit Signal"""

    name: str
    portdir: PortDir


@dataclass
class Connection:
    """# Instance Connection
    A (port, signal) pair, specified in string names."""

    portname: str
    signame: str


@dataclass
class Instance:
    """# Circuit Instance"""

    name: str  # Instance Name
    of: str  # Instance-Of Code-String
    conns: List[Connection]  # Connections


@dataclass
class Circuit:
    """# Circuit
    The circuit-level content of a Schematic. This might alternatively be called a "Module". 
    Consists of collections of Signals, Instances of circuit elements, and connections there-between."""

    name: str  # Circuit Name
    prelude: str  # Code Prelude
    signals: List[Signal]  # Signals
    instances: List[Instance]  # Instances
