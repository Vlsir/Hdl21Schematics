"""
# Python Module Importer

Loads an SVG schematic as a Python module including an HDL21 Generator.
"""

import sys
import importlib
from pathlib import Path

# Local imports
from .code import import_schematic


class SchSvgImporter(importlib.abc.MetaPathFinder):
    """
    # SVG Schematic Python Importer

    Enables inclusion of SVG schematics with Python's `import` keyword.
    For example, given a schematic `schematic.sch.svg` in the current directory,

    ```python
    from . import schematic
    ```

    Imports a `SimpleNamespace` representing the SVG schematic,
    including all attributes collected by `import_schematic`.

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
        """Create the module object from an SVG schematic, in the form of a `SimpleNamespace`.
        This is the central API method of `MetaPathFinder` used by our Importer."""
        return import_schematic(self.schpath)

    def exec_module(self, _module):
        # FIXME: this is another API method of `MetaPathFinder`; write up why we don't use it.
        pass


# Register the importer with the Python import system
sys.meta_path.append(SchSvgImporter())
