import * as React from "react";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { cn } from "~/lib/utils";

export interface FieldLabelProps extends React.ComponentPropsWithoutRef<typeof Label> {
  label: string;
  required?: boolean;
  showIndicator?: boolean; // Allow hiding the badge if needed
}

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  FieldLabelProps
>(({ label, required = false, showIndicator = true, className, ...props }, ref) => {
  return (
    <div className="flex items-center gap-2">
      <Label ref={ref} className={cn(className)} {...props}>
        {label}
      </Label>
      {showIndicator && (
        required ? (
          <Badge
            variant="destructive"
            className="text-[10px] px-1.5 py-0 h-4"
          >
            Required
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 h-4"
          >
            Optional
          </Badge>
        )
      )}
    </div>
  );
});

FieldLabel.displayName = "FieldLabel";

export { FieldLabel };
