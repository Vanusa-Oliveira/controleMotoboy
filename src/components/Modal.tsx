import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Folha que sobe da base no celular. Fecha só pelo X ou Esc: tocar fora não descarta o que foi digitado.
export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        className="bottom-0 top-auto max-h-[92vh] max-w-md translate-y-0 overflow-y-auto rounded-t-3xl p-5 sm:bottom-auto sm:top-[50%] sm:translate-y-[-50%] sm:rounded-3xl"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{title}</DialogTitle>
          <DialogDescription className={description ? "" : "sr-only"}>{description ?? title}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
