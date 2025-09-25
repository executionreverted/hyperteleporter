import { LoaderOne } from "../../../../components/ui/loader";
import { cn } from "../../../lib/utils";
import type { ReactNode } from "react";

interface MagicButtonProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'blue' | 'green' | 'red' | 'purple' | 'default';
}

export function MagicButton({ children, disabled, loading, onClick, className, variant = 'default' }: MagicButtonProps) {
    const getVariantStyles = (variant: string) => {
        switch (variant) {
            case 'blue':
                return 'bg-[conic-gradient(from_90deg_at_50%_50%,#3B82F6_0%,#1E40AF_50%,#3B82F6_100%)]';
            case 'green':
                return 'bg-[conic-gradient(from_90deg_at_50%_50%,#22C55E_0%,#15803D_50%,#22C55E_100%)]';
            case 'red':
                return 'bg-[conic-gradient(from_90deg_at_50%_50%,#EF4444_0%,#DC2626_50%,#EF4444_100%)]';
            case 'purple':
                return 'bg-[conic-gradient(from_90deg_at_50%_50%,#9333EA_0%,#7C3AED_50%,#9333EA_100%)]';
            default:
                return 'bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]';
        }
    };

    const variantGradient = getVariantStyles(variant);

    return (
        <button onClick={onClick} disabled={disabled} className={cn("relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none", className)}>
            <span className={cn("absolute inset-[-1000%] animate-[spin_2s_linear_infinite]", variantGradient, disabled && "opacity-50")} />
            <span className={cn("inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl", disabled && "opacity-50")}> 
                {loading ? <LoaderOne /> : children}
            </span>
        </button>
    );
}

