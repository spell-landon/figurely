import { useState } from "react";
import { Form, Link } from "@remix-run/react";
import { Save, Star, Trash2 } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import type { SavedView } from "~/lib/views";
import { buildUrlFromViewState, getViewDescription } from "~/lib/views";

interface SavedViewsMenuProps {
  /**
   * List of saved views for this table
   */
  views: SavedView[];

  /**
   * Current view state (for saving)
   */
  currentViewState: any;

  /**
   * Table name
   */
  tableName: string;

  /**
   * Currently active view ID (if any)
   */
  activeViewId?: string;
}

export function SavedViewsMenu({
  views,
  currentViewState,
  tableName,
  activeViewId,
}: SavedViewsMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [viewName, setViewName] = useState("");

  const handleSaveView = () => {
    setIsSaving(true);
  };

  const handleCancelSave = () => {
    setIsSaving(false);
    setViewName("");
  };

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Star className="h-4 w-4" />
        <span className="hidden sm:inline">Views</span>
        {views.length > 0 && (
          <span className="hidden sm:inline text-xs text-muted-foreground">({views.length})</span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-2 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-md border bg-popover shadow-lg">
          {/* Save Current View Section */}
          {!isSaving ? (
            <div className="p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleSaveView}
                className="w-full justify-start gap-2"
              >
                <Save className="h-4 w-4" />
                Save Current View
              </Button>
            </div>
          ) : (
            <div className="p-3 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="view-name" className="text-xs">
                  View Name
                </Label>
                <Input
                  id="view-name"
                  type="text"
                  placeholder="e.g., Unpaid Invoices"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  autoFocus
                />
              </div>
              <Form method="post" className="flex gap-2">
                <input type="hidden" name="intent" value="save_view" />
                <input type="hidden" name="view_name" value={viewName} />
                <input type="hidden" name="table_name" value={tableName} />
                <input
                  type="hidden"
                  name="view_state"
                  value={JSON.stringify(currentViewState)}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1"
                  disabled={!viewName.trim()}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCancelSave}
                >
                  Cancel
                </Button>
              </Form>
            </div>
          )}

          {views.length > 0 && <div className="border-t" />}

          {/* Saved Views List */}
          {views.length > 0 ? (
            <div className="max-h-80 overflow-y-auto">
              {views.map((view) => {
                const viewUrl = buildUrlFromViewState(view.view_state);
                const isActive = activeViewId === view.id;

                return (
                  <div
                    key={view.id}
                    className="group flex items-center gap-2 hover:bg-accent px-2 py-1.5"
                  >
                    <Link
                      to={viewUrl}
                      className="flex-1 min-w-0"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex items-center gap-2">
                        <Star
                          className={`h-3.5 w-3.5 flex-shrink-0 ${
                            isActive ? "fill-primary text-primary" : "text-muted-foreground"
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">
                            {view.name}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {getViewDescription(view.view_state)}
                          </div>
                        </div>
                      </div>
                    </Link>

                    {/* Delete Button */}
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete_view" />
                      <input type="hidden" name="view_id" value={view.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!confirm(`Delete view "${view.name}"?`)) {
                            e.preventDefault();
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </Form>
                  </div>
                );
              })}
            </div>
          ) : (
            !isSaving && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No saved views yet.
                <br />
                Save your current filters and sorting to quickly access them later.
              </div>
            )
          )}
          </div>
        </>
      )}
    </div>
  );
}
