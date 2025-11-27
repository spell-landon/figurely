import { Link, useSearchParams } from "@remix-run/react";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { buildSortUrl, getSortIndicator, type SortOrder } from "~/lib/sorting";
import { cn } from "~/lib/utils";

interface SortableTableHeaderProps {
  /**
   * Column identifier for sorting (e.g., "date", "amount")
   */
  column: string;

  /**
   * Display label for the column
   */
  label: string;

  /**
   * Currently sorted column
   */
  currentSortBy: string | null;

  /**
   * Current sort order
   */
  currentSortOrder: SortOrder;

  /**
   * Optional className for styling
   */
  className?: string;

  /**
   * Alignment of the header content
   */
  align?: "left" | "center" | "right";
}

export function SortableTableHeader({
  column,
  label,
  currentSortBy,
  currentSortOrder,
  className,
  align = "left",
}: SortableTableHeaderProps) {
  const [searchParams] = useSearchParams();
  const sortIndicator = getSortIndicator(column, currentSortBy, currentSortOrder);
  const isSorted = sortIndicator !== null;
  const sortUrl = buildSortUrl(searchParams, column, currentSortBy, currentSortOrder);

  const alignmentClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[align];

  const textAlignClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  return (
    <th className={cn("px-4 py-3", textAlignClass, className)}>
      <Link
        to={sortUrl}
        className={cn(
          "inline-flex items-center gap-1.5 font-medium transition-colors",
          "hover:text-foreground",
          isSorted ? "text-foreground" : "text-muted-foreground",
          alignmentClass
        )}
        preventScrollReset
      >
        <span>{label}</span>
        <span className="flex items-center">
          {sortIndicator === null && (
            <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
          )}
          {sortIndicator === "asc" && (
            <ArrowUp className="h-3.5 w-3.5" />
          )}
          {sortIndicator === "desc" && (
            <ArrowDown className="h-3.5 w-3.5" />
          )}
        </span>
      </Link>
    </th>
  );
}
