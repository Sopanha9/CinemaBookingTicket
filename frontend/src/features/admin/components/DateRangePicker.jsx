import { Input } from "../../../components/ui/Input";

export default function DateRangePicker({ from, to, onChange }) {
  const handleFromChange = (value) => {
    const next = { from: value, to };
    if (next.from && next.to && next.to < next.from) {
      next.to = next.from;
    }
    onChange(next);
  };

  const handleToChange = (value) => {
    const next = { from, to: value };
    if (next.from && next.to && next.to < next.from) {
      return;
    }
    onChange(next);
  };

  const invalid = Boolean(from && to && to < from);

  return (
    <div className="space-y-1">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Input
          type="date"
          value={from}
          onChange={(event) => handleFromChange(event.target.value)}
        />
        <Input
          type="date"
          value={to}
          onChange={(event) => handleToChange(event.target.value)}
        />
      </div>
      {invalid ? (
        <p className="text-xs text-error">
          End date cannot be earlier than start date.
        </p>
      ) : null}
    </div>
  );
}
