import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Plus, X } from "lucide-react";

import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ClassOption = { id: string; name: string };

const EMPTY = {
  full_name: "",
  admission_number: "",
  class_id: "",
  roll_number: "",
  date_of_birth: "",
  gender: "",
  father_name: "",
  mother_name: "",
  mobile_number: "",
  address: "",
};

export function AddStudentDialog({ classes }: { classes: ClassOption[] }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY });
  const queryClient = useQueryClient();

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const name = form.full_name.trim();
      const admission = form.admission_number.trim();
      if (!name || name.length > 100) throw new Error("Enter a valid full name");
      if (!admission || admission.length > 50) throw new Error("Enter a valid admission number");
      if (!form.class_id) throw new Error("Select a class");

      const { error } = await supabase.from("students").insert({
        full_name: name,
        admission_number: admission,
        class_id: form.class_id,
        roll_number: form.roll_number ? Number(form.roll_number) : null,
        date_of_birth: form.date_of_birth || null,
        gender: (form.gender || null) as "male" | "female" | "other" | null,
        father_name: form.father_name.trim() || null,
        mother_name: form.mother_name.trim() || null,
        parent_name: form.father_name.trim() || null,
        mobile_number: form.mobile_number.trim() || null,
        address: form.address.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`${form.full_name} added`);
      queryClient.invalidateQueries({ queryKey: ["all-students"] });
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setForm({ ...EMPTY });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message || "Could not add student"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11 rounded-full px-5 font-semibold">
          <Plus className="mr-1 h-4 w-4" /> Add student
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add a new student</DialogTitle>
          <DialogDescription>Enrol a child into a class. Fields marked * are required.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="full_name">Full name *</Label>
            <Input id="full_name" maxLength={100} value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="admission_number">Admission # *</Label>
            <Input id="admission_number" maxLength={50} value={form.admission_number} onChange={(e) => set("admission_number", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Class *</Label>
            <Select value={form.class_id} onValueChange={(v) => set("class_id", v)}>
              <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>
                {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="roll_number">Roll number</Label>
            <Input id="roll_number" type="number" min={1} value={form.roll_number} onChange={(e) => set("roll_number", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth</Label>
            <Input id="dob" type="date" value={form.date_of_birth} onChange={(e) => set("date_of_birth", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <Select value={form.gender} onValueChange={(v) => set("gender", v)}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mobile">Parent mobile</Label>
            <Input id="mobile" maxLength={20} value={form.mobile_number} onChange={(e) => set("mobile_number", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="father">Father's name</Label>
            <Input id="father" maxLength={100} value={form.father_name} onChange={(e) => set("father_name", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mother">Mother's name</Label>
            <Input id="mother" maxLength={100} value={form.mother_name} onChange={(e) => set("mother_name", e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" maxLength={300} value={form.address} onChange={(e) => set("address", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
          <Button className="rounded-full font-semibold" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Saving…" : "Add student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
