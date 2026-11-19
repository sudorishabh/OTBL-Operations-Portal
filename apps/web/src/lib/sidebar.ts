// The cookie the sidebar keeps its expanded or collapsed state in. Kept out of
// the client-only sidebar module so the dashboard layout can read it on the
// server and open the sidebar the way it was left.
export const SIDEBAR_COOKIE_NAME = "sidebar_state";

// Whether a stored sidebar state means expanded. Expanded unless it was
// collapsed on purpose.
export const isSidebarOpen = (value: string | undefined) => value !== "false";
