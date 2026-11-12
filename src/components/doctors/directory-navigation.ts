export function directoryReturnHref(value: string | null) {
  if (
    !value ||
    !/^\/patient\/doctors(?:[?#]|$)/.test(value) ||
    /[\\\u0000-\u001f\u007f]/.test(value)
  )
    return "/patient/doctors";
  const url = new URL(value, "https://dctoralia.local");
  return url.pathname === "/patient/doctors" &&
    url.origin === "https://dctoralia.local"
    ? `${url.pathname}${url.search}`
    : "/patient/doctors";
}
