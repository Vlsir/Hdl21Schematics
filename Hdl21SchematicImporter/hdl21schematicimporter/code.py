""" 
# Code Conversion 

Translate circuits/ modules to executable Python code. 
"""

from copy import copy

# Local imports
from .module import Module, PortDir

# FIXME: eventually these schematics will have their own custom preludes.
# For now, they all get this one.
THE_PRELUDE = """
import hdl21 as h 
from hdl21.primitives import *

# The default `Params` type: no parameters
Params = h.HasNoParams
"""

# FIXMEs:
# * Custom prelude
# * Parameter type


class CodeWriter:
    """Module to Python Code Conversion State"""

    def __init__(self, module: Module):
        self.module = module
        self.code = ""
        self.indent = 0
        self.tab = "    "

    def to_code(self):
        """Convert the Module to Python code"""

        # Write the prelude
        self.code += copy(THE_PRELUDE) + "\n\n"

        # Create the Generator function
        self.writeln(f"@h.generator")
        self.writeln(f"def {self.module.name}(params: Params) -> h.Module:")
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
