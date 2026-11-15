import type { ComponentType } from "react";

export type LabItemMetadata = {
  id: string;
  category: "apparatus" | "material" | "part" | "instrument";
  labelVi: string;
  purposeVi: string;
  safetyVi?: string;
};

export type LabItemAnchor = readonly [x: number, y: number, z: number];

export type SharedLabItem<SceneProps, ViewProps = SceneProps> = LabItemMetadata & {
  Component3D: ComponentType<SceneProps>;
  Component2D?: ComponentType<ViewProps>;
  anchors: Readonly<Record<string, LabItemAnchor>>;
};
