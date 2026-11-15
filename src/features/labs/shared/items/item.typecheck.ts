import type { LabItemAnchor, SharedLabItem } from "./item";

type SceneProps = { reading: number };

const example = {
  id: "example-instrument",
  category: "instrument",
  labelVi: "Dụng cụ mẫu",
  purposeVi: "Hiển thị số đọc từ bàn.",
  Component3D: (_props: SceneProps) => null,
  anchors: { base: [0, 0, 0] },
} satisfies SharedLabItem<SceneProps>;

// @ts-expect-error An anchor must include x, y and z.
const incompleteAnchor: LabItemAnchor = [0, 0];
