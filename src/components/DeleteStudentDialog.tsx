import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function DeleteStudentDialog({
  studentId,
  name,
  photoUrl,
}: {
  studentId: string;
  name: string;
  photoUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleDelete() {
    setBusy(true);
    try {
      const { error: attError } = await supabase.from("attendance").delete().eq("student_id", studentId);
      if (attError) throw attError;

      const { error } = await supabase.from("students").delete().eq("id", studentId);
      if (error) throw error;

      if (photoUrl) {
        await supabase.storage.from("student-photos").remove([photoUrl]);
      }

      toast.success(`${name} removed`);
      await queryClient.invalidateQueries();
      setOpen(false);
      void navigate({ to: "/students" });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not remove student");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="rounded-full gap-2">
          <Trash2 className="h-4 w-4" /> Remove student
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes the student profile, photo, and all attendance records. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              void handleDelete();
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {busy ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
