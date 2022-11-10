//
// # Panels
//
// Essentially everything in the schematic UI that is not the central schematic canvas.
//

import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import TextField from "@mui/material/TextField";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import SvgIcon from "@mui/material/SvgIcon";
import useMediaQuery from "@mui/material/useMediaQuery";

// Local Imports
import { theEditor } from "./editor";

// # Panels
//
// The top-level "everything else" component, including all but the central schematic canvas.
//
// This is re-rendered on most editor UI-state changes, e.g. those from "add instance" to "idle",
// so should be relatively light weight.
//
export function Panels() {
  // Track the system-level color-theme preference via `useMediaQuery`.
  // Note the SchEditor has its own tracking of this.
  // FIXME! actually react to this!
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  // Create the `Panels` react state, and give the parent `SchEditor` a way to update it.
  //
  // This is another bit of startup dancing.
  // The way the `SchEditor` gets changes into `Panels` is via its state-updater function,
  // which is embedded as a closure in the `updatePanels` function after the first render.
  //
  // This also generally requires that the `SchEditor` have its own copy of the panels state,
  // which, eh, we guess is alright. But requires that essentially *any* update goes through
  // `theEditor.updatePanels`, *not* directly updating the copy here,
  // lest the two get out of sync.
  //
  const [state, updater] = React.useState(panelProps.default);
  theEditor.panelUpdater = updater;

  // While this is called Panel*s* (plural), thus far there is only one, the right side, which gets all the props.
  return (
    <React.Fragment>
      <RightPanel {...state} />
    </React.Fragment>
  );
}

// Property types for the react-based `Panels`
export interface PanelProps {
  panelOpen: boolean;
  controlPanel: ControlPanelProps;
  codePrelude: CodePreludeProps;
}
// Associated "impl" functions
export const panelProps = {
  // Create the default-value `PanelProps`.
  // Note it's important that we keep `PanelProps` default-constructible,
  // so that it can be used as a react state, i.e. passed as an initial value to `useState`.
  default: (): PanelProps => {
    return {
      panelOpen: true,
      controlPanel: { items: [] },
      codePrelude: { codePrelude: "" },
    };
  },
};
// Type alias for functions which take a `PanelProps` and return nothing.
// Commonly used for updating `Panels`.
export type PanelUpdater = (props: PanelProps) => void;

const drawerWidth = 240;

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "flex-start",
}));

function RightPanel(props: PanelProps) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

  const { controlPanel, codePrelude } = props;

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    theEditor.updatePanels({
      ...theEditor.uiState.panelProps,
      panelOpen: false,
    });
  };

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
      variant="persistent"
      anchor="right"
      open={props.panelOpen}
    >
      <DrawerHeader>
        <IconButton onClick={handleDrawerClose}>
          {theme.direction === "rtl" ? (
            <ChevronLeftIcon />
          ) : (
            <ChevronRightIcon />
          )}
        </IconButton>
      </DrawerHeader>
      <Divider />

      {/* Code-prelude editor text input */}
      <CodePreludeEditor {...codePrelude} />

      {/* The primary list of controls */}
      <ControlPanelList {...controlPanel} />
    </Drawer>
  );
}

interface CodePreludeProps {
  codePrelude: string;
}
function CodePreludeEditor(props: CodePreludeProps) {
  // const ref = React.useRef<HTMLInputElement>();
  return (
    <TextField
      id="outlined-multiline-static"
      label="Code Prelude"
      multiline
      rows={8}
      value={props.codePrelude}
      onChange={(e) => theEditor.updateCodePrelude(e.target.value)}
      onFocus={(_) => theEditor.startEditPrelude()}
      onBlur={(_) => theEditor.goUiIdle()}
      // FIXME: add the "exit this mode on escape" functionality.
      // This doesn't quite do it.
      // onKeyDown={(e) => {
      //   if (e.key === Keys.Escape && ref.current) {
      //     ref.current.blur();
      //     return theEditor.goUiIdle();
      //   }
      // }}
    />
  );
}

// List of ControlPanel items
function ControlPanelList(props: ControlPanelProps) {
  return (
    <List>
      {props.items.map((item, index) => (
        <ListItem key={index} disablePadding onClick={item.onClick}>
          <ListItemButton>
            <ListItemIcon>
              <KeyboardIcon shortcutKey={item.shortcutKey} />
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

function KeyboardIcon(props: { shortcutKey: string }) {
  return (
    <SvgIcon>
      <rect
        width="24"
        height="24"
        rx="8"
        ry="8"
        stroke="grey"
        fill="lightgrey"
      />
      <text
        x="12"
        y="12"
        fontFamily="menlo"
        fontSize="16"
        textAnchor="middle"
        alignmentBaseline="middle"
        stroke="black"
      >
        {props.shortcutKey}
      </text>
    </SvgIcon>
  );
}

// # Control Panel Item
//
// An entry in the control panel list,
// including its text, logos, and click handler.
//
export interface ControlPanelItem {
  text: string; // Text displayed in the control panel
  icon: any; // FIXME: whatever this gonna be
  shortcutKey: any; // FIXME: that too
  onClick: () => void; // Callback when clicked
}

interface ControlPanelProps {
  items: Array<ControlPanelItem>;
}
