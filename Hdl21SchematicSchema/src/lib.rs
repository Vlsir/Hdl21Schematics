#[cfg(feature = "python")]
use pyo3::prelude::*;
use serde::{Deserialize, Serialize};

macro_rules! derives {
    (pub struct $name:ident { $($tt:tt)* }) => {
        #[cfg_attr(feature = "python", pyclass)]
        #[derive(Serialize, Deserialize)]
        pub struct $name { $($tt)* }
    };
}

pub mod point;
pub mod schematic;

#[cfg(feature = "wasm")]
pub mod wasm;
#[cfg(feature = "wasm")]
pub use wasm::*;

#[cfg(feature = "python")]
pub mod python;
#[cfg(feature = "python")]
pub use python::*;
