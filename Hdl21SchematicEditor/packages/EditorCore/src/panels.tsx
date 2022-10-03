/*
 * # Panels
 *
 * Essentially everything in the schematic UI that is not the central schematic canvas.
 */

import * as React from "react";
import { styled, useTheme } from "@mui/material/styles";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
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

// Another bit of startup dancing.
//
// The way the `SchEditor` gets changes into `Panels` is via its state-updater function,
// which is embedded as a closure in the `updatePanels` function after the first render.
//
// This also generally requires that the `SchEditor` have its own copy of the panels state,
// which, eh, we guess is alright.
//
export let updatePanels = (props: PanelProps) => {};

// # Panels
//
// The top-level "everything else" component, including all but the central schematic canvas.
//
// This is re-rendered on most editor UI-state changes, e.g. those from "add instance" to "idle",
// so should be relatively light weight.
//
export function Panels() {
  const [state, updater] = React.useState(panelProps.default());
  updatePanels = (props: PanelProps) => updater(props);

  return (
    <React.Fragment>
      <ControlPanel {...state.controlPanel} />
    </React.Fragment>
  );
}

// Property types for the react-based `Panels`
export interface PanelProps {
  controlPanel: ControlPanelProps;
}
// Associated "impl" functions
export const panelProps = {
  default: (): PanelProps => ({ controlPanel: controlPanelProps.default() }),
};

const drawerWidth = 240;

const DrawerHeader = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  padding: theme.spacing(0, 1),
  // necessary for content to be below app bar
  ...theme.mixins.toolbar,
  justifyContent: "flex-start",
}));

function ControlPanel(props: ControlPanelProps) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    setOpen(true);
  };

  const handleDrawerClose = () => {
    setOpen(false);
  };

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: drawerWidth,
        },
      }}
      variant="persistent"
      anchor="right"
      open={true}
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

      {/* The primary list of controls */}
      <ControlPanelList {...props} />
    </Drawer>
  );
}

function ControlPanelList(props: ControlPanelProps) {
  // let list;
  // if (props.items.length > 0) {
  //   list = props.items.map((item, _) => item.text);
  // } else {
  //   list = controlPanels.getList(props.whichKind);
  // }
  // const list = props.items;

  return (
    <List>
      {props.items.map((item, index) => (
        <ListItem key={index} disablePadding onClick={item.onClick}>
          <ListItemButton>
            <ListItemIcon>
              <AccessTimeIcon />
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );
}

const PrimList = ["Nmos", "Pmos", "Res", "Res3", "Cap", "Cap3", "Ind", "Ind3"];
const PortList = ["Input", "Output", "Inout"];
const ActionList = ["Add Instance", "Add Wire", "Edit Prelude"];

export interface ControlPanelItem {
  text: string; // Text displayed in the control panel
  icon: any; // FIXME: whatever this gonna be
  shortcutKey: any; // FIXME: that too
  onClick: () => void; // Callback when clicked
}

export enum ControlPanels {
  Empty = "Empty",
  ActionList = "ActionList",
  PrimList = "PrimList",
  PortList = "PortList",
}
export const controlPanels = {
  default: (): ControlPanels => ControlPanels.Empty,
  next: (p: ControlPanels): ControlPanels => {
    switch (p) {
      case ControlPanels.ActionList:
        return ControlPanels.PrimList;
      case ControlPanels.PrimList:
        return ControlPanels.PortList;
      case ControlPanels.PortList:
      default:
        return ControlPanels.ActionList;
    }
  },
  getList: (p: ControlPanels): Array<string> => {
    switch (p) {
      case ControlPanels.Empty:
        return [];
      case ControlPanels.ActionList:
        return ActionList;
      case ControlPanels.PrimList:
        return PrimList;
      case ControlPanels.PortList:
      default:
        return PortList;
    }
  },
};

interface ControlPanelProps {
  items: Array<ControlPanelItem>;
}

export const controlPanelProps = {
  default: (): ControlPanelProps => ({
    items: [],
  }),
};
