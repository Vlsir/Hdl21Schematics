// Compile-time exhaustiveness check
// Returns an `Error` so that we can one-line the failing default case, in patterns like:
//
// switch (direction) {
//  case Dir.Horiz: ...
//  case Dir.Vert: ...
//  default: throw exhaust(direction);
// }
//
export function exhaust(_: never): Error {
  return new Error();
}
