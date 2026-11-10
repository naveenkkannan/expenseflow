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
import { useGroups, useCreateGroup, useUpdateGroup, useDeleteGroup } from "@/hooks/useExpenses";

export function ManageGroupsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { data: groups, isLoading } = useGroups();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup();
  const deleteGroup = useDeleteGroup();

  const [newName, setNewName] = React.useState("");
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await createGroup.mutateAsync(newName.trim());
      setNewName("");
      toast.success("Group added.");
    } catch {
      toast.error("Could not add the group.");
    }
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    try {
      await updateGroup.mutateAsync({ id, name: editingName.trim() });
      setEditingId(null);
      toast.success("Group renamed.");
    } catch {
      toast.error("Could not rename the group.");
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this group? Its expenses will become ungrouped.")) return;
    try {
      await deleteGroup.mutateAsync(id);
      toast.success("Group deleted.");
    } catch {
      toast.error("Could not delete the group.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage groups</DialogTitle>
          <DialogDescription>Add, rename or delete expense groups.</DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col gap-2">
          {isLoading && <li className="text-sm text-muted-foreground">Loading…</li>}
          {groups?.map((g) => (
            <li key={g.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
              {editingId === g.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="h-9"
                    autoFocus
                  />
                  <Button variant="ghost" size="icon" aria-label="Save group name" className="h-9 w-9" onClick={() => handleRename(g.id)}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Cancel rename" className="h-9 w-9" onClick={() => setEditingId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{g.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Rename ${g.name}`}
                    className="h-9 w-9"
                    onClick={() => {
                      setEditingId(g.id);
                      setEditingName(g.name);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${g.name}`}
                    className="h-9 w-9 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(g.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </li>
          ))}
          {groups?.length === 0 && !isLoading && (
            <li className="text-sm text-muted-foreground">No groups yet.</li>
          )}
        </ul>

        <form onSubmit={handleCreate} className="flex items-center gap-2 border-t border-border pt-4">
          <Input
            placeholder="New group name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            aria-label="New group name"
          />
          <Button type="submit" size="icon" aria-label="Add group" disabled={createGroup.isPending}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
