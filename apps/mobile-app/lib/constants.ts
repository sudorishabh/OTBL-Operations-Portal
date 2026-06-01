import { Platform } from "react-native";

/**
 * API URL configuration
 * - Android emulator: 10.0.2.2 maps to host's localhost
 * - iOS simulator: localhost works directly
 * - Physical device: use your computer's LAN IP address
 *
 * For production, replace with your actual API URL
 */
const DEV_API_URL = Platform.select({
  android: "http://172.16.104.117:7200", // Use LAN IP for physical Android devices
  ios: "http://172.16.104.117:7200", // Use LAN IP for physical iOS devices
  default: "http://172.16.104.117:7200", // Fallback
});

export const API_URL = process.env.EXPO_PUBLIC_API_URL || DEV_API_URL;
export const TRPC_URL = `${API_URL}/trpc`;

/**
 * App theme colors — matches web design language
 */
export const Colors = {
  // Primary brand colors (from sidebar)
  primary: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669", // emerald-600 (active states)
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
  },
  // Accent / Sidebar background
  accent: {
    50: "#ecfeff",
    100: "#cffafe",
    200: "#a5f3fc",
    600: "#0891b2",
    700: "#0e7490",
    800: "#155e75",
    900: "#164e63", // cyan-900 (sidebar bg)
  },
  // Neutral grays
  gray: {
    50: "#f9fafb",
    100: "#f3f4f6",
    200: "#e5e7eb",
    300: "#d1d5db",
    400: "#9ca3af",
    500: "#6b7280",
    600: "#4b5563",
    700: "#374151",
    800: "#1f2937",
    900: "#111827",
    950: "#030712",
  },
  // Status colors
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  info: "#3b82f6",
  // Base
  white: "#ffffff",
  black: "#000000",
  background: "#f0fdfa", // light green-tinged bg
  surface: "#ffffff",
};

/**
 * Role definitions — mirrors web role hierarchy
 */
export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  OFFICE_OPERATOR: "office_operator",
  SITE_OPERATOR: "site_operator",
} as const;

export const ROLE_HIERARCHY: Record<string, number> = {
  admin: 3,
  manager: 2,
  office_operator: 1,
  site_operator: 1,
};
