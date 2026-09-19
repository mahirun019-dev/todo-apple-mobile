export function dashboardCanonicalHref(href: string): string | null {
  const url = new URL(href);
  if (url.searchParams.get("view") !== "dashboard") return null;

  url.searchParams.delete("view");
  url.searchParams.delete("filter");
  url.searchParams.delete("company");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function normalizeDashboardUrl(): void {
  if (typeof window === "undefined") return;
  const canonicalHref = dashboardCanonicalHref(window.location.href);
  if (canonicalHref) window.history.replaceState(window.history.state, "", canonicalHref);
}
