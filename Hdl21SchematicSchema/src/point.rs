// #[cfg(feature = "python")]
// use pyo3::prelude::*;
use serde::{Deserialize, Serialize};
use schemars::JsonSchema;


// #[cfg_attr(feature = "python", pyclass)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct Point {
    pub x: i64,
    pub y: i64,
}
