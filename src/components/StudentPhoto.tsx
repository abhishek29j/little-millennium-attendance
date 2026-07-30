import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const STUDENT_PHOTOS_BUCKET = "student-photos";

/** Resolves a stored value (bucket path or absolute URL) into a displayable src. */
export function useStudentPhotoUrl(value: string | null | undefined) {
  const [src, setSrc] = useState<string | null>(
    value && /^https?:\/\//.test(value) ? value : null,
  );

  useEffect(() => {
    let cancelled = false;
    if (!value) {
      setSrc(null);
      return;
    }
    if (/^https?:\/\//.test(value)) {
      setSrc(value);
      return;
    }
    supabase.storage
      .from(STUDENT_PHOTOS_BUCKET)
      .createSignedUrl(value, 60 * 60)
      .then(({ data }) => {
        if (!cancelled) setSrc(data?.signedUrl ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [value]);

  return src;
}

export function StudentPhoto({
  name,
  value,
  className = "h-12 w-12",
  textClassName = "",
}: {
  name: string;
  value: string | null | undefined;
  className?: string;
  textClassName?: string;
}) {
  const src = useStudentPhotoUrl(value);
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");

  if (src) return <img src={src} alt={name} className={`${className} shrink-0 rounded-full object-cover`} />;
  return (
    <div className={`${className} grid shrink-0 place-items-center rounded-full bg-primary/15 font-bold text-primary ${textClassName}`}>
      {initials}
    </div>
  );
}
