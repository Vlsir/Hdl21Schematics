// Compile-time exhaustiveness check
// Returns an `Error` so that we can one-line the failing default case, in patterns like:
//
// switch (direction) {
//  case Dir.Horiz: ...
//  case Dir.Vert: ...
//  default: throw exhaust(direction);
// }
//
// This is essentially an opt-in version of the Rust enum-exhaustiveness check.
//
// The trick here is:
// * The argument to `exhaust` is the `never` type, which will not allow any value to be passed.
// * We return an `Error` so the Typescript compiler can recognize that `throw`ing its return value would end the calling function.
//
export function exhaust(_: never): Error {
  return new Error(); // Note if used as intended, the body of this function is unreachable.
}
