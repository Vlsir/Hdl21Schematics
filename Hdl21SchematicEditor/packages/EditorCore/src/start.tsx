/*
 * # Startup Bootstrapping Dance
 *
 * This is all about reconciling the React-based content (sidebars and similar)
 * with the singleton "editor", "canvas", and related schematic content.
 *
 */

import * as React from "react";
import { createRoot } from "react-dom/client";
import CssBaseline from "@mui/material/CssBaseline";

// Workspace Imports
import { Platform } from "PlatformInterface";

// Local Imports
import { THE_SECRET_CANVAS_ID } from "./secret";
import { theEditor } from "./editor";
import { Panels } from "./panels";

// Plenty of this library to date is designed assuming a single instance. E.g. "the" editor, "the" canvas.
// This can change, some day, but for now we expose a function that only allows one to be created.
let started: boolean = false;

// Our exposed startup entry point: take a `Platform`, produce an Editor UI.
export function start(platform: Platform): void {
  if (started) {
    console.log("Warning: SchEditor already started, refusing to start again.");
    return;
  }
  started = true;

  // # Sch Editor Starter
  // A React component that "does nothing", but starts up the module-scope editor.
  // This and its parent have no props and no state, and are never re-rendered after their initial drawing.
  class SchEditorStarter extends React.Component {
    // Rendering, which happens *before* `componentDidMount`, creates the parent DOM element.
    render = () => <div id={THE_SECRET_CANVAS_ID} />;
    // Mounting, which happens *after* `render`, starts the editor.
    componentDidMount = () => theEditor.start(platform);
  }

  // Have React render our top-level component.
  // Note React 18 warns against rendering directly onto `document.body`, for what we imagine must be good enough reasons.
  // So we create this `root` div first.
  const root = document.body.appendChild(document.createElement("div"));
  createRoot(root).render(
    <div>
      <CssBaseline />
      <SchEditorStarter />
      <Panels />
    </div>
  );
}
