import { useId, type ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base aria-[invalid=true]:border-destructive";

type ControlProps = { id: string; "aria-invalid": boolean; "aria-describedby"?: string };

// Rótulo ligado ao campo, dica e mensagem de erro junto do próprio campo.
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (p: ControlProps) => ReactNode;
}) {
  const id = useId();
  const descId = `${id}-desc`;
  const text = error ?? hint;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children({ id, "aria-invalid": !!error, "aria-describedby": text ? descId : undefined })}
      {text && (
        <p id={descId} className={`mt-1 text-xs ${error ? "font-medium text-destructive" : "text-muted-foreground"}`}>
          {text}
        </p>
      )}
    </div>
  );
}
