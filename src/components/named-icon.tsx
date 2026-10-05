import { getCategoryIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";

export function NamedIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = getCategoryIcon(name);
  return <Icon className={cn("size-5", className)} strokeWidth={1.75} />;
}
