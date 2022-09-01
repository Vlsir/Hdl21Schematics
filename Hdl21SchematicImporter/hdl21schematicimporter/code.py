""" 
# Code Conversion 

Translate circuits/ modules to executable Python code. 
"""

from copy import copy
from dataclasses import dataclass
from typing import Type, Optional

import hdl21 as h

# Local imports
from .module import Module, PortDir

# FIXME: eventually these schematics will have their own custom preludes.
# For now, they all get this one.
THE_PRELUDE = """

import hdl21 as h 
from hdl21.primitives import *
"""

# The default `Params` type: no parameters
DEFAULT_PARAM_TYPE = """
# Default (no) Params
Params = h.HasNoParams
"""


# FIXMEs:
# * Custom preludes


@dataclass
class GeneratorSpec:
    """Interim "spec" for the Hdl21 Generator ultimately produced."""

    name: str
    paramtype: Optional[Type]


class CodeWriter:
    """Module to Python Code Conversion State"""

    def __init__(self, module: Module):
        self.module = module
        self.code = ""
        self.indent = 0
        self.tab = "    "

    def specs(self) -> GeneratorSpec:
        """Get the attributes we care about from the schematic prelude, by ... aahhhh ... `exec()`ing it."""

        # It's really this simple: execute the prelude, and examine a few fields that it can define.
        scope = dict()
        exec(THE_PRELUDE, scope)

        # Get the `name` attribute, if defined
        name = scope.get("name", None)
        if name is not None and not isinstance(name, str):
            self.fail(f"Invalid `name` attribute in prelude: {name}, must be a string")
        name = name or self.module.name

        # Get the `Params` attribute, if defined
        paramtype = scope.get("Params", None)
        if paramtype is not None and not h.isparamclass(paramtype):
            msg = f"Invalid `Params` attribute in prelude: {paramtype}, must be a ParamClass"
            self.fail(msg)

        return GeneratorSpec(name, paramtype)

    def to_code(self):
        """Convert the Module to Python code"""

        # Write the prelude
        self.code += copy(THE_PRELUDE) + "\n\n"

        # Get the Generator specs from the prelude
        spec = self.specs()

        # If no `Params` type is defined, alias it to `HasNoParams`
        if spec.paramtype is None:
            self.writeln(DEFAULT_PARAM_TYPE)

        # Create the Generator function
        self.writeln(f"@h.generator")
        self.writeln(f"def {spec.name}(params: Params) -> h.Module:")
        self.indent += 1

        # Create the Module
        self.writeln(f"m = h.Module()")
        self.writeln("")

        # Declare Ports
        ports = [
            s for s in self.module.signals.values() if s.portdir != PortDir.INTERNAL
        ]
        port_constructors = {
            PortDir.INPUT: "h.Input",
            PortDir.OUTPUT: "h.Output",
            PortDir.INOUT: "h.Inout",
            PortDir.PORT: "h.Port",
        }
        for port in ports:
            constructor = port_constructors.get(port.portdir, None)
            if constructor is None:
                self.fail("Invalid port direction for {port}")

            self.writeln(f"m.{port.name} = {constructor}()")

        self.writeln("")

        # Declare internal Signals
        internal_signals = [
            s for s in self.module.signals.values() if s.portdir == PortDir.INTERNAL
        ]
        for signal in internal_signals:
            self.writeln(f"m.{signal.name} = h.Signal()")

        self.writeln("")

        # Write Instances
        for instance in self.module.instances.values():
            conns = ", ".join(
                [f"{portname}=m.{sig.name}" for portname, sig in instance.conns.items()]
            )
            self.writeln(f"m.{instance.name} = {instance.of}({conns})")

        # And return the resultant Module
        self.writeln("")
        self.writeln(f"return m")

        self.indent -= 1
        return self.code

    def writeln(self, line: str):
        """Write a line with indentation"""
        self.code += self.tab * self.indent + line + "\n"

    def fail(self, msg: str):
        raise ValueError(msg)


def to_code(module: Module) -> str:
    return CodeWriter(module).to_code()


def to_generator(module: Module):
    code = to_code(module)
    scope = dict()
    exec(code, scope)
    return scope
