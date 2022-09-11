//!
//! # WASM Bindings
//!

// Crates.io
use serde::{de::DeserializeOwned, ser::Serialize as SerializeTrait, Deserialize, Serialize};
use wasm_bindgen::prelude::*;

// Local Imports
use crate::point::Point;
use crate::schematic::{Instance, Orientation, Port, Rotation, Schematic};

// In WASM use `wee_alloc` as the global allocator.
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

/// Things that are, well, to be determined.
#[derive(Serialize, Deserialize)]
pub struct Tbd;

/// Convert a serialize-able object to a `JsValue`.
pub fn to_jsval(val: &impl SerializeTrait) -> Result<JsValue, JsValue> {
    Ok(serde_wasm_bindgen::to_value(val)?)
}

/// Convert a deserialize-able object of type `RT` from JavaScript.
pub fn from_jsval<RT: DeserializeOwned>(val: JsValue) -> Result<RT, JsValue> {
    Ok(serde_wasm_bindgen::from_value(val)?)
}

/// # Encode `Schematic` sch as SVG text.
/// Javascript entry point.
#[wasm_bindgen]
pub fn encodeSvg(jsSch: JsValue) -> Result<JsValue, JsValue> {
    let sch: Schematic = from_jsval(jsSch)?;
    // FIXME: gonna be some error mapping here
    let svg = sch_to_svg(&sch)?;
    to_jsval(&svg)
}

/// # Decode SVG text to a `Schematic`.
/// Javascript entry point.
#[wasm_bindgen]
pub fn decodeSvg(svg: &str) -> Result<JsValue, JsValue> {
    let sch = svg_to_sch(svg)?;
    Ok(serde_wasm_bindgen::to_value(&sch)?)
}

/// Encode a `Schematic` as an SVG string
/// FIXME: error type
pub fn sch_to_svg(sch: &Schematic) -> Result<String, JsValue> {
    todo!()
}

/// Decode a `Schematic` from an SVG string
/// FIXME: error type
pub fn svg_to_sch(svg: &str) -> Result<Schematic, JsValue> {
    todo!()
}

// Reminders from the wasm-bindgen tutorial, until we remember this stuff
// #[wasm_bindgen]
// extern "C" {
//     fn alert(s: &str);
// }
// #[wasm_bindgen]
// pub fn greet() {
//     alert("Hello, hdl21schematics-wasm!");
// }
pub fn set_panic_hook() {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function at least once during initialization, and then
    // we will get better error messages if our code ever panics.
    //
    // For more details see
    // https://github.com/rustwasm/console_error_panic_hook#readme
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
}
