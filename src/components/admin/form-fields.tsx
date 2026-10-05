import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATEGORY_ICONS } from "@/lib/icons";
import { cn } from "@/lib/utils";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function TextField({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <Field label={label}>
      <Input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}

export function AreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Textarea value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function ActiveField({
  checked,
  onChange,
  label = "Activo",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} />
      {label}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Seleccionar",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function IconField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Icono">
      <div className="grid max-h-48 grid-cols-6 gap-1 overflow-y-auto rounded-lg bg-muted p-2 sm:grid-cols-8">
        {CATEGORY_ICONS.map((icon) => {
          const Icon = icon.Icon;
          const selected = value === icon.name;
          return (
            <button
              key={icon.name}
              type="button"
              title={icon.label}
              aria-label={icon.label}
              aria-pressed={selected}
              onClick={() => onChange(icon.name)}
              className={cn(
                "flex size-10 items-center justify-center rounded-md",
                selected
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-foreground hover:bg-secondary",
              )}
            >
              <Icon className="size-5" />
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Field label="Color">
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="size-10 cursor-pointer rounded-md border border-input bg-card"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} />
      </div>
    </Field>
  );
}
