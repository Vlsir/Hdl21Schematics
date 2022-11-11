""" 
# Code Conversion 

Translate circuits/ modules to executable Python code. 
"""

from copy import copy
from pathlib import Path
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Type, Optional

# "Friendly" imports
import hdl21

# Local imports
from .circuit import Circuit, PortDir
from .svg import svg_to_circuit


# The default code-prelude. Imports hdl21 and its primitive library.
DEFAULT_PRELUDE = """
# Default Schematic Code-Prelude
import hdl21 as h 
from hdl21.primitives import *
"""

# The default `Params` type: no parameters
DEFAULT_PARAM_TYPE = """
# Default Params
Params = h.HasNoParams
"""


@dataclass
class GeneratorSpec:
    """Interim "spec" for the Hdl21 Generator ultimately produced."""

    name: str  # Generator Name
    prelude: str  # Code-prelude string, which may be the default
    paramtype: Optional[Type]  # Parameter type. None if none defined.


class CodeWriter:
    """Circuit to Python Code Conversion State"""

    def __init__(self, circuit: Circuit):
        self.circuit: Circuit = circuit  # The input Circuit
        self.code: str = ""  # The result code string
        self.indent: int = 0  # Current indentation level, in "tabs"
        self.tab: str = "    "  # Per-tab indentation string

    def specs(self) -> GeneratorSpec:
        """Get the attributes we care about from the schematic prelude, by ... aahhhh ... `exec()`ing it."""

        # Set the "pre-prelude": "import hdl21 as h"
        scope = dict(h=hdl21)

        # It's really this simple: execute the prelude, and examine a few fields that it can define.
        prelude = self.circuit.prelude.strip() or copy(DEFAULT_PRELUDE)
        exec(prelude, scope)

        # After executing the prelude, check that `h` still refers to the hdl21 module, or fail
        h = scope.get("h", None)
        if h is not hdl21:
            msg = "Prelude must not redefine the identifier `h`: this must remain the `hdl21` module."
            self.fail(msg)

        # Get the `name` attribute, if defined
        name = scope.get("name", None)
        if name is not None and not isinstance(name, str):
            self.fail(f"Invalid `name` attribute in prelude: {name}, must be a string")
        name = name or self.circuit.name
        if not name:
            msg = f"Invalid `name` attribute in prelude: {name}, must be a non-empty string"
            self.fail(msg)

        # Get the `Params` attribute, if defined
        paramtype = scope.get("Params", None)
        if paramtype is not None and not h.isparamclass(paramtype):
            msg = f"Invalid `Params` attribute in prelude: {paramtype}, must be a ParamClass"
            self.fail(msg)

        return GeneratorSpec(name, prelude, paramtype)

    def to_code(self):
        """Convert the Circuit to Python code"""

        # Get the Generator specs from the prelude
        spec = self.specs()

        # Write the prelude
        self.code += copy(spec.prelude) + "\n\n"

        # If no `Params` type is defined, alias it to `HasNoParams`
        if spec.paramtype is None:
            self.writeln(DEFAULT_PARAM_TYPE)

        # Create the Generator function
        self.writeln(f"@h.generator")
        self.writeln(f"def {spec.name}(params: Params) -> h.Module:")
        self.indent += 1

        # Create the Circuit
        self.writeln(f"m = h.Module()")
        self.writeln("")

        # Declare Ports
        ports = [s for s in self.circuit.signals if s.portdir != PortDir.INTERNAL]
        port_constructors = {
            PortDir.INPUT: "h.Input",
            PortDir.OUTPUT: "h.Output",
            PortDir.INOUT: "h.Inout",
        }
        for port in ports:
            constructor = port_constructors.get(port.portdir, None)
            if constructor is None:
                self.fail("Invalid port direction for {port}")

            self.writeln(f"m.{port.name} = {constructor}()")

        self.writeln("")

        # Declare internal Signals
        internal_signals = [
            s for s in self.circuit.signals if s.portdir == PortDir.INTERNAL
        ]
        for signal in internal_signals:
            self.writeln(f"m.{signal.name} = h.Signal()")

        self.writeln("")

        # Write Instances
        for instance in self.circuit.instances:
            conns = ", ".join(
                [f"{conn.portname}=m.{conn.signame}" for conn in instance.conns]
            )
            self.writeln(f"m.{instance.name} = {instance.of}({conns})")

        # And return the resultant Circuit
        self.writeln("")
        self.writeln(f"return m")

        self.indent -= 1
        return self.code

    def writeln(self, line: str):
        """Write a line with indentation"""
        self.code += self.tab * self.indent + line + "\n"

    def fail(self, msg: str):
        raise ValueError(msg)


def circuit_to_code(circuit: Circuit) -> str:
    """Convert a `Circuit` to Python code"""
    return CodeWriter(circuit).to_code()


def import_schematic(path: Path) -> SimpleNamespace:
    """
    # SVG to Hdl21 Namespace

    The end-to-end import function, from an on-disk SVG `Path` to a Python `SimpleNamespace` including an HDL21 Generator.
    Given a valid SVG schematic, will import a `SimpleNamespace` containing:

    * The HDL21 Generator representing the schematic content
    * Its parameter type `Params`
    * All other attributes defined in the schematic's prelude
    """

    # Load the circuit from SVG
    circuit = svg_to_circuit(path)
    # Convert it to Python code
    code = circuit_to_code(circuit)

    # Execute the code, and return the resulting namespace
    scope = dict()
    exec(code, scope)
    return SimpleNamespace(**scope)
