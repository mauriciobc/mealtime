import type { Metadata } from "next";

const appName = "MealTime";

export function pageMetadata(
  title: string,
  description: string,
  options?: { noIndex?: boolean }
): Metadata {
  return {
    title: `${title} | ${appName}`,
    description,
    ...(options?.noIndex && { robots: { index: false, follow: false } }),
  };
}
