//!
//! # Python Bindings
//!

use pyo3::prelude::*;

use crate::point::Point;

#[pyfunction]
fn q() -> PyResult<String> {
    Ok("?".to_string())
}
#[pymodule]
fn hdl21schematics(_py: Python, m: &PyModule) -> PyResult<()> {
    // m.add_class::<Point>()?;
    Ok(())
}
