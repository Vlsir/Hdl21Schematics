""" 
# Module

Circuits extracted from schematics, 
and the action-code to extract them.
"""

from typing import Dict, List, Optional
from enum import Enum, auto
from dataclasses import dataclass, field

# Local imports
from .schematic import (
    Schematic,
    Wire,
    Point,
    Instance as SchInstance,
    OrientationMatrix,
)
from .primitive import PrimitiveKind, primitives


class PortDir(Enum):
    """Schematic Signal/ Port Direction
    Including the `INTERNAL` variant for internal Signals"""

    INTERNAL = auto()
    INPUT = auto()
    OUTPUT = auto()
    INOUT = auto()
    PORT = auto()


@dataclass
class Signal:
    name: str
    portdir: PortDir
    wires: List[Wire] = field(repr=False)

    def intersects(self, pt: Point) -> bool:
        """Boolean indication of wheter `pt` intersects with any of the Signal's Wires."""
        return any(wire.intersects(pt) for wire in self.wires)


@dataclass
class Instance:
    """Module Instance"""

    name: str  # Instance Name
    of: str  # Instance-Of Code-String
    sch_instance: SchInstance = field(repr=False)  # Source Schematic Instance
    conns: Dict[str, Signal] = field(default_factory=dict)  # Connections


@dataclass
class Module:
    name: str
    signals: Dict[str, Signal] = field(default_factory=dict)
    instances: Dict[str, Instance] = field(default_factory=dict)


# List of the primitive kinds which are really port annotations
port_primitive_types = (
    PrimitiveKind.INOUT,
    PrimitiveKind.INPUT,
    PrimitiveKind.OUTPUT,
)


class SchematicConverter:
    """# Schematic to Module Converter State"""

    def __init__(self, sch: Schematic):
        self.sch = sch
        self.module = Module(name=sch.name)
        # FIXME! creating Signal names here, ignoring the SVG ones, for now
        self.num_signals = 0

    def convert(self):
        self.collect_signals()
        self.collect_ports()
        self.collect_instances()
        return self.module

    def collect_signals(self):
        # Merge all the schematic's Wires into Signals
        # Start by creating integer "pointers" to them in a dict
        wires = {num: wire for num, wire in enumerate(self.sch.wires)}

        # Inspect each, merging into any intersecting Wires
        while wires:
            _num, wire = wires.popitem()
            pending = [wire]
            this_signals_wires = [wire]
            while pending:
                wire = pending.pop()
                for othernum in list(wires.keys()):
                    other = wires[othernum]
                    # If the `other` wire intersects with this one, merge them.
                    if any([wire.intersects(pt) for pt in other.points]) or any(
                        [other.intersects(pt) for pt in wire.points]
                    ):
                        wires.pop(othernum)
                        pending.append(other)
                        this_signals_wires.append(other)

            # Found all intersecting Wires. Create a new signal for them.
            name = f"s{self.num_signals}"  # FIXME! naming
            signal = Signal(
                name=name,
                portdir=PortDir.INTERNAL,
                wires=this_signals_wires,
            )
            self.num_signals += 1
            self.module.signals[name] = signal

    def collect_ports(self):
        """Collect port-annotation objects and update their connected Signals."""

        # Get the port-annotation objects
        schematic_ports = [
            inst for inst in self.sch.instances if inst.kind in port_primitive_types
        ]
        for port_instance in schematic_ports:
            primitive = primitives.get(port_instance.kind, None)
            if primitive is None:
                self.fail(f"Unknown primitive {port_instance.kind}")

            if len(primitive.ports) != 1:
                self.fail(
                    f"Primitive {port_instance.kind} has {len(primitive.ports)} ports, but only 1 is supported"
                )

            # Transform the primitive-referenced port location to the instance's location
            prim_port = primitive.ports[0]
            matrix = OrientationMatrix.from_orientation(port_instance.orientation)
            instance_port_loc = transform(prim_port.loc, matrix, port_instance.loc)

            # Check if the port intersects with any of the existing signals
            intersecting_signal = self.intersecting_signal(instance_port_loc)
            if intersecting_signal is None:
                msg = f"Port {port_instance.name} does not intersect with any existing signal"
                self.fail(msg)

            # Rename the intersecting signal to the port's name
            # Also replace its key in the `self.module.signals` dict
            self.module.signals.pop(intersecting_signal.name)
            intersecting_signal.name = port_instance.name
            self.module.signals[intersecting_signal.name] = intersecting_signal
            if port_instance.kind == PrimitiveKind.INPUT:
                intersecting_signal.portdir = PortDir.INPUT
            elif port_instance.kind == PrimitiveKind.OUTPUT:
                intersecting_signal.portdir = PortDir.OUTPUT
            elif port_instance.kind == PrimitiveKind.INOUT:
                intersecting_signal.portdir = PortDir.INOUT
            else:  # Should be unreachable
                self.fail(f"Unknown port type {port_instance.kind}")

    def collect_instances(self):
        # Get the non-port instances
        sch_instances = [
            inst for inst in self.sch.instances if inst.kind not in port_primitive_types
        ]
        # Find all the schematic's instance ports
        for sch_instance in sch_instances:
            if sch_instance.name in self.module.instances:
                self.fail(f"Duplicate instance name {sch_instance.name}")
            module_instance = Instance(
                name=sch_instance.name,
                of=sch_instance.of,
                sch_instance=sch_instance,
            )
            self.module.instances[sch_instance.name] = module_instance

            primitive = primitives.get(sch_instance.kind, None)
            if primitive is None:
                self.fail(f"Unknown primitive {sch_instance.kind}")

            for prim_port in primitive.ports:
                # Transform the primitive-referenced port location to the instance's location
                matrix = OrientationMatrix.from_orientation(sch_instance.orientation)
                instance_port_loc = transform(prim_port.loc, matrix, sch_instance.loc)

                # Check if the port intersects with any of the existing signals
                intersecting_signal = self.intersecting_signal(instance_port_loc)
                if intersecting_signal is None:
                    msg = f"Port {prim_port.name} on Instance {sch_instance} does not intersect with any existing signal"
                    self.fail(msg)
                module_instance.conns[prim_port.name] = intersecting_signal

    def intersecting_signal(self, loc: Point) -> Optional[Signal]:
        """Get the Signal at location `loc`.
        Returns None if no Signal is found.
        Note calls to `intersecting_signal` are invalid until `module.signals` is populated."""
        for signal in self.module.signals.values():
            if signal.intersects(loc):
                return signal
        return None

    def fail(self, msg: str):
        raise RuntimeError(msg)


def transform(pt: Point, mat: OrientationMatrix, loc: Point) -> Point:
    """Apply the `OrientationMatrix` transformation to `pt`.
    Computes `pt * mat + loc`."""
    return Point(
        x=mat.a * pt.x + mat.c * pt.y + loc.x,
        y=mat.b * pt.x + mat.d * pt.y + loc.y,
    )


def to_module(sch: Schematic) -> Module:
    """Extract a module from a schematic.
    Raises a `RuntimeError` if the schematic cannot be converted to a valid `Module`."""
    return SchematicConverter(sch).convert()
