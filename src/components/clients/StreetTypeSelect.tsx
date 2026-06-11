import { Select } from "@/components/ui/Field";
import { STREET_TYPES } from "@/lib/customer-address";

interface StreetTypeSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function StreetTypeSelect({ value, onChange }: StreetTypeSelectProps) {
  return (
    <Select value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">— Tipo de vía —</option>
      {STREET_TYPES.map((type) => (
        <option key={type.id} value={type.id}>
          {type.label}
        </option>
      ))}
    </Select>
  );
}
