import {
  Bike,
  Car,
  CarFront,
  Gauge,
  LayoutGrid,
  Mountain,
  type LucideIcon,
} from "lucide-react";

/** Keep aligned with UI chip order — types still match Prisma `Category` names. */
export const CATEGORIES = [
  "FORMULA",
  "SPORTSCAR",
  "STOCK_CAR",
  "MOTORCYCLE",
  "RALLY",
  "OTHER",
] as const;

export type UiCategory = (typeof CATEGORIES)[number];

const ICON_MAP: Record<UiCategory, LucideIcon> = {
  FORMULA: Gauge,
  SPORTSCAR: CarFront,
  STOCK_CAR: Car,
  MOTORCYCLE: Bike,
  RALLY: Mountain,
  OTHER: LayoutGrid,
};

/** Sharp Lucide glyphs at chip size (`currentColor` from parent). */
export function CategoryIcon({
  category,
  className = "",
}: {
  category: UiCategory;
  className?: string;
}) {
  const Icon = ICON_MAP[category];
  return (
    <Icon
      aria-hidden
      className={`size-7 shrink-0 opacity-95 ${className}`.trim()}
      strokeWidth={1.85}
      absoluteStrokeWidth
    />
  );
}
