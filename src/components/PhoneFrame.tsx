import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Stylized device-frame shell used only for Interview Preview. Fixed width
 * makes the preview feel like "what respondents see on their phone".
 */
export default function PhoneFrame({ children, className }: Props) {
  return (
    <div className={`mx-auto w-full max-w-[340px] ${className ?? ""}`}>
      <div className="relative rounded-[42px] bg-slate-900 p-2 shadow-phone">
        <div className="relative overflow-hidden rounded-[34px] bg-gradient-to-b from-slate-900 to-slate-800 text-white">
          <div className="pointer-events-none absolute left-1/2 top-2 z-20 flex h-5 w-24 -translate-x-1/2 items-center justify-center rounded-full bg-black">
            <div className="h-1 w-10 rounded-full bg-slate-800" />
          </div>
          <div className="min-h-[540px] px-5 pb-8 pt-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
