/** Only same-origin product destinations can survive an authentication round trip. */
export function safeAuthReturnPath(
  value: string | null,
  role?: "DOCTOR" | "PATIENT" | "ADMIN",
) {
  if (role === "ADMIN") return null;
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return null;
  const url = new URL(value, "https://dopilot.local");
  if (url.origin !== "https://dopilot.local") return null;
  const matches = (prefix: string) =>
    url.pathname === prefix || url.pathname.startsWith(`${prefix}/`);
  if (
    !(
      matches("/dashboard") ||
      matches("/patient") ||
      matches("/book-appointment") ||
      matches("/doctor")
    )
  )
    return null;
  if (
    (role === "PATIENT" && matches("/dashboard")) ||
    (role === "DOCTOR" && matches("/patient"))
  )
    return null;
  return `${url.pathname}${url.search}${url.hash}`;
}
export function authPageHref(
  page: "/login" | "/register",
  destination: string | null,
) {
  return destination
    ? `${page}?${new URLSearchParams({ callbackUrl: destination })}`
    : page;
}
