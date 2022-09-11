
# Hdl21 Schematic Schema 

In-progress attempt at centralizing the SVG schema, schematic importer and exporter, in Rust, and embedding it in JavaScript and Python. Thus far, some parts of this work better than others. As of this writing this is not in use by other parts of `Hdl21Schematics`. 

Python and JavaScript/ WASM bindings are provided by PyO3 and wasm-bindgen respectively. The two do not play well together. We separately compile for each "target" with Cargo features: 

* The `python` feature compiles the Python bindings.
* The `wasm` feature compiles the JavaScript bindings.
* Compiling without any features compiles the Rust library, largely for testing.

Each binding library has its preferred CLI: 

* `maturin` for Python PyO3
* `wasm-pack` for JavaScript wasm-bindgen

To build with Python bindings: 

```
maturin build --features python
```

And to install this into the current Python environment:

```
maturin develop --features python
```

To build WASM bindings: 

```
wasm-pack build --features wasm
```

To run the in-browser WASM tests, using headless Chrome: 

```
wasm-pack test --chrome --headless
```

## Status

Neither binding generator does quite what we want out of the box. Particularly, the interface we'd like is something like: 

```rust 
#[derive(SomeBindingStuff)]
pub struct Schematic {
    // ...
}

#[derive(SomeBindingStuff)]
pub encode(schematic: &Schematic) -> String {
    // ...
}

#[derive(SomeBindingStuff)]
pub decode(svg: &str) -> Schematic {
    // ...
}
```

I.e. expose the compound set of `Schematic` types, and two functions which encode and decode them to and from SVG text. 

Both WASM and Python bindings fall short in one way or another. 

* `wasm-bindgen` does not support passing Rust's `Vec` back to JS/ WASM. Schematics are, by and large, built of `Vec`s. 
* PyO3 does not comprehend the Rust `enum`. Schematics use only simple "C style" enums. So we may be able to write a custom implementation for each. 

Instead of `wasm-bindgen`'s direct struct-bindings, we serialize and deserialize each pass through the JS-Rust interface via [serde-wasm-bindgen](https://github.com/cloudflare/serde-wasm-bindgen). This likely has significant overhead (although compared to what is less clear). 

## Other Notes 

* `cargo test` with the Python feature freaks out, with long linker errors. Why and what to do about it is TBD. 

