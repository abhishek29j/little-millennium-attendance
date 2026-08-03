import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { StudentPhoto, STUDENT_PHOTOS_BUCKET } from "@/components/StudentPhoto";
import { Button } from "@/components/ui/button";

export function EditStudentPhoto({
  studentId,
  name,
  value,
  onUpdated,
}: {
  studentId: string;
  name: string;
  value: string | null | undefined;
  onUpdated: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function setPhotoUrl(next: string | null, oldPath: string | null | undefined) {
    const { error } = await supabase.from("students").update({ photo_url: next }).eq("id", studentId);
    if (error) throw new Error(error.message);
    if (oldPath && !/^https?:\/\//.test(oldPath)) {
      await supabase.storage.from(STUDENT_PHOTOS_BUCKET).remove([oldPath]);
    }
  }

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }
    setBusy(true);
    try {
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${crypto.randomUUID()}.${ext || "jpg"}`;
      const { error: uploadError } = await supabase.storage
        .from(STUDENT_PHOTOS_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) throw new Error(`Photo upload failed: ${uploadError.message}`);
      await setPhotoUrl(path, value);
      toast.success("Photo updated");
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update photo");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleRemove() {
    setBusy(true);
    try {
      await setPhotoUrl(null, value);
      toast.success("Photo removed");
      onUpdated();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <StudentPhoto name={name} value={value} className="h-20 w-20 text-2xl" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="Change student photo"
          className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>
      {value && (
        <Button type="button" variant="ghost" size="sm" onClick={() => void handleRemove()} disabled={busy} className="rounded-full text-muted-foreground">
          <Trash2 className="mr-1 h-4 w-4" /> Remove
        </Button>
      )}
    </div>
  );
}
