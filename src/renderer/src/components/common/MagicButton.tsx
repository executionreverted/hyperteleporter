import { LoaderOne } from "../../../../components/ui/loader";
import { cn } from "../../../lib/utils";
import type { ReactNode } from "react";

interface MagicButtonProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
}

export function MagicButton({ children, disabled, loading, onClick, className }: MagicButtonProps) {
    return (
        <button onClick={onClick} disabled={disabled} className={cn("relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50", className)}>
            <span className={cn("absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]", disabled && "opacity-50")} />
            <span className={cn("inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl", disabled && "opacity-50")}> 
                {loading ? <LoaderOne /> : children}
            </span>
        </button>
    );
}

