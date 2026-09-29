import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Modal panel on the native <dialog> element (focus trap, Esc and backdrop for free).
 * A bottom sheet on phones, a centred dialog from the `sm` breakpoint up.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="sheet-title"
      onClose={onClose}
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 backdrop:bg-transparent"
    >
      {/* Full-screen dimmer; tapping it closes the sheet. */}
      <button type="button" aria-label="Close" tabIndex={-1} onClick={onClose} className="absolute inset-0 h-full w-full cursor-default bg-black/55 backdrop-blur-[2px]" />
      <div className="bg-surface-raised text-foreground absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl">
        <div className="border-border relative flex items-center justify-between gap-3 border-b px-5 py-3.5">
          <span aria-hidden className="bg-border-strong absolute top-1.5 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full sm:hidden" />
          <h2 id="sheet-title" className="text-[15px] font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted-foreground hover:bg-secondary hover:text-foreground grid h-8 w-8 place-items-center rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Mounted only while open, so canvases inside measure a visible size. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{open ? children : null}</div>
        {footer ? (
          <div className="border-border border-t px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
        ) : null}
      </div>
    </dialog>
  );
}
