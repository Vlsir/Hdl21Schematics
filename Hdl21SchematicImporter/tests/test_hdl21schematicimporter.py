from types import SimpleNamespace

import hdl21 as h
from hdl21schematicimporter import (
    __version__,
    svg_to_circuit,
    circuit_to_code,
    import_schematic,
)
from hdl21schematicimporter.circuit import Circuit


def test_version():
    assert __version__ == "0.1.0"


def test_svg_to_circuit():
    circuit = svg_to_circuit("schematic.sch.svg")
    assert isinstance(circuit, Circuit)
    # print(circuit)


def test_circuit_to_code():
    circuit = svg_to_circuit("schematic.sch.svg")
    code = circuit_to_code(circuit)
    assert isinstance(code, str)
    assert "@h.generator" in code
    # print(code)


def test_import_schematic():
    ns = import_schematic("schematic.sch.svg")
    assert isinstance(ns, SimpleNamespace)
    assert isinstance(ns.schematic, h.Generator)
    assert ns.Params is h.HasNoParams


def test_pyimporter():
    """Test the import-override mechanics of the pyimporter module."""

    # Import the SVG schematic as a Python module/ namespace
    from . import schematic

    assert isinstance(schematic, SimpleNamespace)
    assert isinstance(schematic.schematic, h.Generator)
    assert isinstance(schematic.schematic(), h.GeneratorCall)
    assert h.isparamclass(schematic.Params)

    # "Import from" the Generator itself
    from .schematic import schematic

    assert isinstance(schematic, h.Generator)
    assert isinstance(schematic(), h.GeneratorCall)

    # "Import from" the parameter type
    from .schematic import Params

    assert h.isparamclass(Params)
