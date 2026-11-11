import * as React from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ColorPicker } from "@/components/expenses/ColorPicker";
import { useSpendTags, useCreateSpendTag, useUpdateSpendTag, useDeleteSpendTag } from "@/hooks/useDaily";

export function ManageTagsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: tags, isLoading } = useSpendTags();
  const createTag = useCreateSpendTag();
  const updateTag = useUpdateSpendTag();
  const deleteTag = useDeleteSpendTag();

  const [newName, setNewName] = React.useState("");
  const [newColor, setNewColor] = React.useState("#3b82f6");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");
  const [editingColor, setEditingColor] = React.useState("#3b82f6");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createTag.mutateAsync({ name: newName.trim(), color: newColor });
      setNewName("");
      toast.success("Tag added.");
    } catch {
      toast.error("Could not add the tag.");
    }
  }

  async function handleSave(id: string) {
    if (!editingName.trim()) return;
    try {
      await updateTag.mutateAsync({ id, name: editingName.trim(), color: editingColor });
      setEditingId(null);
      toast.success("Tag updated.");
    } catch {
      toast.error("Could not update the tag.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this tag? Its spends will become untagged.")) return;
    try {
      await deleteTag.mutateAsync(id);
      toast.success("Tag deleted.");
    } catch {
      toast.error("Could not delete the tag.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage tags</DialogTitle>
          <DialogDescription>Add, rename, recolour or delete spending tags.</DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {isLoading && <li className="text-sm text-muted-foreground">Loading…</li>}
          {tags?.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 rounded-md border border-border px-3 py-2">
              {editingId === t.id ? (
                <>
                  <div className="flex items-center gap-2">
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="h-9"
                      autoFocus
                    />
                    <Button variant="ghost" size="icon" aria-label="Save tag" className="h-11 w-11" onClick={() => handleSave(t.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Cancel edit" className="h-11 w-11" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <ColorPicker value={editingColor} onChange={setEditingColor} />
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} aria-hidden="true" />
                  <span className="flex-1 text-sm">{t.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Edit ${t.name}`}
                    className="h-11 w-11"
                    onClick={() => {
                      setEditingId(t.id);
                      setEditingName(t.name);
                      setEditingColor(t.color);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${t.name}`}
                    className="h-11 w-11 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(t.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </li>
          ))}
          {tags?.length === 0 && !isLoading && (
            <li className="text-sm text-muted-foreground">No tags yet.</li>
          )}
        </ul>

        <form onSubmit={handleCreate} className="flex flex-col gap-2 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="New tag name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              aria-label="New tag name"
            />
            <Button type="submit" size="icon" aria-label="Add tag" disabled={createTag.isPending}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <ColorPicker value={newColor} onChange={setNewColor} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
