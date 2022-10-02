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

// Our exposed startup entry point: take a `Platform`, produce an Editor UI.
export function start(platform: Platform): void {
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
  createRoot(document.body).render(
    <div>
      <CssBaseline />
      <SchEditorStarter />
      <Panels />
    </div>
  );
  // FIXME: react complains about attaching to `body` now, presumably for decent-enough reasons.
}
