import logoAsset from "@/assets/little-millennium-logo.jpg.asset.json";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src={logoAsset.url}
      alt="Little Millennium Attendance logo"
      className={cn("h-11 w-auto rounded-xl bg-card object-contain", className)}
    />
  );
}
