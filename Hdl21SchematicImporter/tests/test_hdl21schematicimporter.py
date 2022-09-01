from hdl21schematicimporter import __version__, import_svg, to_module, to_code


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
    print(code)
