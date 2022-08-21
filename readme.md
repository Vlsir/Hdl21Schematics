
# Hdl21 Schematics 

(Maybe some intro about how & where schematics tend to be useful, and less than useful)


## 1. Schematics are SVGs

* They are not *like* SVGs. They are not *exportable to* SVGs. They *are* SVGs. 
* So: 
  * Anyone with any computer can *read* their content. Including services like GitHub, GitLab, and any computer with a web browser. 
  * *Writing* their content requires some special software


* SVG is an XML-based schema, and allows for semi-custom metadata attached to each element. This metadata, plus the structure of the document, is what makes an SVG a schematic. 
* Probably have a convention to give them a sub-file-extension of `.sch.svg`. 
* This also allows for rich, arbitrary annotations and metadata, such as: 
  * Any other custom vector-graphics, e.g. block diagrams
  * Layout intent, e.g. how to position and/or route elements
  * Links to external content, e.g. testbenches, related schematics, etc.


## 2. There are no custom symbols, **and never will be**.

* Schematics consist solely of instances of *primitive* devices, similar to those comprising the primitive libraries of SPICE, Hdl21, and VLSIR. 
  * Examples: transistors, resistors, capacitors, voltage sources, ports. 
  * FIXME: list the compete set, it's not long 
  * They *do not* include higher-level devices. Not even relatively low-level devices such as logic gates. 
* Primitive symbols *do not* correspond to a single particular device. They consist solely of: 
  * The (pretty) picture 
  * A named, located set of terminals 
  * Two string-valued fields, `@name` and `@of` - 
    * `@name` is the instance name, as in Verilog, SPICE, Virtuoso, and most other hardware descriptions. 
    * `@of` determines the type of device.
  * The `@of` field is executed as code. It will often contain parameter values and expressions thereof. To create a valid schematic, the result of evaluating the `@of` field must be - 
    * An Hdl21 `Instantiable`, and 
    * Include the same ports as the symbol 

Examples of valid values of `@of` for the NMOS symbol: 

```
hdl21.primitives.Nmos(w=1e-6)
```

```
from asap7 import nmos 

nmos(l=7e-9, w=1e-6)
```


* SVG includes a definitions (`<defs>`) section, which serves as a place to hold the primitive symbol definitions. 

```svg
<?xml version="1.0" encoding="utf-8"?>
<svg viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- The Nmos Symbol -->
    <g id="hdl21::primitives::nmos">
        <path d="M 0 136 L 0 144 L 10 144 L 10 160 L 0 160 L 0 168" style="..."/>
        <!-- ... the other shapes in the symbol ... -->
    </g>
  </defs>

  <!-- A located instance of the Nmos symbol -->
  <use href="#hdl21::primitives::nmos" x="5" y="5" />

</svg>
```

* To be read by general-purpose software e.g. the GitHub viewer, each schematic-svg includes the primitive symbol definitions in its `defs` section.
* At minimum each must include the symbols which the particular schematic *uses*. Omitting the symbols it does not is an optimization that may or may not be made. 


## 3. Schematics are imported as Hdl `Generator`s

* Each schematic includes a "code prelude" - a text section which imports anything the schematic is to use


## How This Works 

* Python allows for custom importers, which can be triggered by specific 