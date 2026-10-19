// Only same-site paths are allowed as a post-login destination, so a crafted
// ?next= link can't send someone to another site after they sign in.
export function safeNext(next: unknown): string {
  if (
    typeof next !== "string" ||
    !next.startsWith("/") ||
    next.startsWith("//") ||
    next.includes("\\")
  ) {
    return "/";
  }
  return next;
}
