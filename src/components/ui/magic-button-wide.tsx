import { ReactNode } from "react";
import { cn } from "../../renderer/lib/utils";
import { LoaderOne } from "./loader";

interface MagicButtonWideProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    variant?: 'blue' | 'green' | 'red' | 'purple' | 'default';
}

export default function MagicButtonWide({ children, className, onClick, disabled, loading, variant = 'default' }: MagicButtonWideProps) {
  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'blue':
        return {
          gradient: 'bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(59,130,246,0.6)_0%,rgba(59,130,246,0)_75%)]',
          bottomLine: 'from-blue-400/0 via-blue-400/90 to-blue-400/0'
        };
      case 'green':
        return {
          gradient: 'bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(34,197,94,0.6)_0%,rgba(34,197,94,0)_75%)]',
          bottomLine: 'from-green-400/0 via-green-400/90 to-green-400/0'
        };
      case 'red':
        return {
          gradient: 'bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(239,68,68,0.6)_0%,rgba(239,68,68,0)_75%)]',
          bottomLine: 'from-red-400/0 via-red-400/90 to-red-400/0'
        };
      case 'purple':
        return {
          gradient: 'bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(147,51,234,0.6)_0%,rgba(147,51,234,0)_75%)]',
          bottomLine: 'from-purple-400/0 via-purple-400/90 to-purple-400/0'
        };
      default:
        return {
          gradient: 'bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)]',
          bottomLine: 'from-emerald-400/0 via-emerald-400/90 to-emerald-400/0'
        };
    }
  };

  const variantStyles = getVariantStyles(variant);

  return (
    <button className={cn("bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-xs font-semibold leading-6 text-white inline-block focus:outline-none", disabled && "opacity-50 cursor-not-allowed", className)} onClick={onClick} disabled={disabled}>
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <span className={cn("absolute inset-0 rounded-full opacity-0 transition-opacity duration-500 group-hover:opacity-100", variantStyles.gradient)}></span>
        </span>
        <div className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-0.5 px-4 ring-1 ring-white/10">
          <span>{loading ? <LoaderOne /> : children}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M10.75 8.75L14.25 12L10.75 15.25"
            ></path>
          </svg>
        </div>
        <span className={cn("absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r transition-opacity duration-500 group-hover:opacity-40", variantStyles.bottomLine)}></span>
      </button>
  );
}