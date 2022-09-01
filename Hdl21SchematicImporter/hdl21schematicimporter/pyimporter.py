"""
# Python Module Importer

Loads an SVG schematic as a Python module including an HDL21 Generator.
"""

import sys
import importlib
from pathlib import Path
from types import SimpleNamespace

# Local imports
from .svg import import_svg
from .module import to_module
from .code import to_generator


def namespace(path: Path) -> SimpleNamespace:

    schematic = import_svg(path)
    module = to_module(schematic)
    d = to_generator(module)
    return SimpleNamespace(**d)


class SchSvgImporter(importlib.abc.MetaPathFinder):
    """
    # SVG Schematic Python Importer

    Enables inclusion of SVG schematics with Python's `import` keyword.
    For example, given a schematic `schematic.sch.svg` in the current directory,

    ```python
    from . import schematic
    ```

    will import a `SimpleNamespace` containing:

    * The HDL21 Generator `schematic`, representing the schematic content
    * Its parameter type `Params`
    * All other attributes defined in the schematic's prelude

    There is one `SchSvgImporter` instance per Python process.
    It is added to the `sys` module's `meta_path` at import time.
    `SchSvgImporter` serves both the roles of "finder" and "loader"
    as defined in the Python import system.
    """

    def find_spec(self, fullname: str, path: list, target=None):
        """Look for a `.sch.svg` file at `path`, or raise an `ImportError` if not found."""

        if path is None:  # Absolute imports are not supported
            return None

        # FIXME: this only works for "from . import name" for now!
        modulename = fullname.split(".")[-1]
        p = Path(path[0])
        pypath = p / f"{modulename}.py"
        schpath = p / f"{modulename}.sch.svg"

        # Operate on files for which (a) a `.sch.svg` file exists *AND* (b) a `.py` file does not.
        if schpath.exists() and not pypath.exists():
            self.schpath = schpath
            return importlib.machinery.ModuleSpec(fullname, self)

        # Otherwise, let the rest of the import machinery handle it.
        return None

    def create_module(self, _spec: importlib.machinery.ModuleSpec):
        return namespace(self.schpath)

    def exec_module(self, module):
        pass


sys.meta_path.append(SchSvgImporter())
