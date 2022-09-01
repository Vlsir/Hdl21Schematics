import hdl21 as h
from hdl21schematicimporter import (
    __version__,
    import_svg,
    to_module,
    to_code,
    to_generator,
)


def test_version():
    assert __version__ == "0.1.0"


def test_import_svg():
    schematic = import_svg("schematic.sch.svg")
    # print(schematic)


def test_to_module():
    schematic = import_svg("schematic.sch.svg")
    module = to_module(schematic)
    # print(module)


def test_to_code():
    schematic = import_svg("schematic.sch.svg")
    module = to_module(schematic)
    code = to_code(module)
    # print(code)


def test_to_generator():
    schematic = import_svg("schematic.sch.svg")
    module = to_module(schematic)
    gen = to_generator(module)
    # print(gen)


def test_pyimporter():
    from . import schematic

    assert isinstance(schematic.schematic, h.Generator)
    assert isinstance(schematic.schematic(), h.GeneratorCall)
    assert h.isparamclass(schematic.Params)

    from .schematic import schematic

    assert isinstance(schematic, h.Generator)
    assert isinstance(schematic(), h.GeneratorCall)

    from .schematic import Params

    assert h.isparamclass(Params)
