//!
//! # The Schematic Model
//!
//! Content of `Schematic`s, independent of SVG formatting.
//!

// Crates.io
// #[cfg(feature = "python")]
// use pyo3::prelude::*;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

// Local Imports
use crate::point::Point;

// FIXME: getting this into Python?
/// Enumerated 90 Degree Rotations
#[derive(Serialize, Deserialize, JsonSchema)]
pub enum Rotation {
    R0,
    R90,
    R180,
    R270,
}

/// # Orientation
/// Including reflection & rotation.
/// Reflection is about the x-axis (vertical), and is applied *before* rotation
// #[cfg_attr(feature = "python", pyclass)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct Orientation {
    /// Vertical reflection across the x axis, before rotation
    pub reflected: bool,
    // /// 90 degree rotation
    // pub rotation: Rotation,// FIXME: python?
}

// FIXME: Python?
#[derive(Serialize, Deserialize, JsonSchema)]
pub enum PrimitiveKind {
    TBD,
}
// FIXME: Python?
#[derive(Serialize, Deserialize, JsonSchema)]
pub enum PortKind {
    TBD,
}

/// # Schematic Instance
// #[cfg_attr(feature = "python", pyclass)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct Instance {
    pub name: String,
    pub of: String,
    // pub kind: PrimitiveKind,// FIXME: python?
    pub loc: Point,
    pub orientation: Orientation,
}
/// # Schematic Port
// #[cfg_attr(feature = "python", pyclass)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct Port {
    pub name: String,
    // pub kind: PortKind, // FIXME: python?
    pub loc: Point,
    pub orientation: Orientation,
}

/// # Wire
/// Principally comprised of an SVG-path-like list of `Point` and a net-`name` annotation.
// #[cfg_attr(feature = "python", pyclass)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct Wire {
    pub name: String,
    pub points: Vec<Point>,
}

// #[cfg_attr(feature = "python", pyclass)]
#[derive(Serialize, Deserialize, JsonSchema)]
pub struct Schematic {
    pub name: String,
    pub prelude: String,
    pub size: Point,
    pub instances: Vec<Instance>,
    pub wires: Vec<Wire>,
    pub ports: Vec<Port>,
    pub dots: Vec<Point>,
}
