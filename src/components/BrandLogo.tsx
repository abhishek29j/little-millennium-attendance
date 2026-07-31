import logoUrl from "@/assets/logo.jpg";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Little Millennium Attendance logo"
      className={cn("h-11 w-auto rounded-xl bg-card object-contain", className)}
    />
  );
}
