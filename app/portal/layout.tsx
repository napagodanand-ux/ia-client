import type { ReactNode } from "react";

export default function PortalLayout({ children }: { children: ReactNode }) {
  return <section>{children}</section>;
}
