/*
 * # Changes & Change Log
 *
 * The undo-redo queue and its member types.
 */

import { Label, SchPort, Instance, Entity } from "./drawing";
import { Place } from "./place";
import { exhaust } from "./errors";

// Enumerate Kinds of Changes
// Each `Change` variant has a `kind` field that is one of these values.
export enum ChangeKind {
  Add = "Add",
  Move = "Move",
  Remove = "Remove",
  EditText = "EditText",
}

export interface Add {
  kind: ChangeKind.Add;
  entity: Entity;
}

export interface Remove {
  kind: ChangeKind.Remove;
  entity: Entity;
}

export interface Move {
  kind: ChangeKind.Move;
  entity: SchPort | Instance;
  from: Place;
  to: Place;
}

export interface EditText {
  kind: ChangeKind.EditText;
  label: Label;
  from: string;
  to: string;
}

// The primary `Change` union type
export type Change = Add | Remove | Move | EditText;

// Get the inverse of a change, i.e. that which undoes it.
export function inverse(change: Change): Change {
  switch (change.kind) {
    case ChangeKind.Add:
      return {
        kind: ChangeKind.Remove,
        entity: change.entity,
      };
    case ChangeKind.Remove:
      return {
        kind: ChangeKind.Add,
        entity: change.entity,
      };
    case ChangeKind.Move:
      return {
        kind: ChangeKind.Move,
        entity: change.entity,
        from: change.to,
        to: change.from,
      };
    case ChangeKind.EditText:
      return {
        kind: ChangeKind.EditText,
        label: change.label,
        from: change.to,
        to: change.from,
      };
    default:
      throw exhaust(change);
  }
}

// # Change Log
//
// A list of changes for undo/redo.
// Note key methods `undo` and `redo` *return* `Change`s to be made.
// The `ChangeLog` itself is not responsible for making the changes.
//
export class ChangeLog {
  // List of Changes
  changes: Array<Change> = [];
  // Current head pointer. Potentially in the middle of the list during undo/ redo actions.
  head: number = -1;

  // Boolean indication of whether there are and currently undone changes.
  get undoing(): boolean {
    return this.head < this.changes.length - 1;
  }

  // Add a new change. Drops all changes after the current head.
  add(change: Change): void {
    if (this.undoing) {
      // Chop off any undone changes
      this.changes = this.changes.slice(0, this.head + 1);
    }
    this.changes.push(change);
    this.head += 1;
  }

  // Get the Change that undoes the current head-pointer Change.
  // Decrements the head pointer along the way.
  undo(): Change | null {
    if (this.head < 0) {
      return null;
    }
    const change = this.changes[this.head];
    this.head -= 1;
    return inverse(change);
  }

  // Get the `Change` that redoes the most recently undone `Change`.
  // I.e. when we have "undone" changes, and the head pointer is not at the end,
  // get the head pointer `Change`. Increments the head pointer along the way.
  redo() {
    if (this.head >= this.changes.length - 1) {
      return null;
    }
    this.head += 1;
    return this.changes[this.head];
  }
}
