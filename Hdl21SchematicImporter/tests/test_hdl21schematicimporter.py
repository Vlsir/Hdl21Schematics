from hdl21schematicimporter import __version__, import_svg


def test_version():
    assert __version__ == '0.1.0'

def test_import_svg():
    schematic = import_svg("schematic.sch.svg")
    print(schematic)
