import * as React from "react";
import { toast } from "sonner";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useGroups, useCreateGroup } from "@/hooks/useExpenses";

const NEW_GROUP_VALUE = "__new__";
const NONE_VALUE = "__none__";

export function GroupSelect({
  value,
  onChange,
  id,
}: {
  value: string | null;
  onChange: (groupId: string | null) => void;
  id?: string;
}) {
  const { data: groups } = useGroups();
  const createGroup = useCreateGroup();
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");

  async function handleCreate() {
    if (!newName.trim()) return;
    try {
      const group = await createGroup.mutateAsync(newName.trim());
      onChange((group as { id: string }).id);
      setCreating(false);
      setNewName("");
      toast.success("Group added.");
    } catch {
      toast.error("Could not add the group.");
    }
  }

  if (creating) {
    return (
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={id}>New group name</Label>
        <div className="flex gap-2">
          <Input
            id={id}
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleCreate();
              }
            }}
          />
          <Button type="button" onClick={handleCreate} disabled={createGroup.isPending}>
            Add
          </Button>
          <Button type="button" variant="outline" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Select
      value={value ?? NONE_VALUE}
      onValueChange={(v) => {
        if (v === NEW_GROUP_VALUE) {
          setCreating(true);
          return;
        }
        onChange(v === NONE_VALUE ? null : v);
      }}
    >
      <SelectTrigger id={id}>
        <SelectValue placeholder="No group" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE_VALUE}>No group</SelectItem>
        {groups?.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
        <SelectItem value={NEW_GROUP_VALUE}>+ New group</SelectItem>
      </SelectContent>
    </Select>
  );
}
