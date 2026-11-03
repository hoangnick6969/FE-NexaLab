import type { ReactNode } from "react";

/** Stable overlay frame shared by the fluid kit's stage, HUD and inspector. */
export function FluidKitLayoutShell({ children, className = "", mode, testId = "fluid-kit-shell", ariaLabel }: {
  children: ReactNode;
  className?: string;
  mode?: "2d" | "3d";
  testId?: string;
  ariaLabel?: string;
}) {
  return <div className={`fluid-kit-shell${className ? ` ${className}` : ""}`} role="region" data-testid={testId} data-renderer-mode={mode} aria-label={ariaLabel}>
    {children}
  </div>;
}
