import { AnimatePresence, motion } from "motion/react";
import { cn } from "../../renderer/lib/utils";
import { useState } from "react";
import diskSvg from "../../renderer/src/assets/disk.svg";

export const HoverEffect = ({
  items,
  className,
  onDelete,
  onItemClick,
}: {
  items: {
    id: string;
    title: string;
    description: string;
    link: string;
  }[];
  className?: string;
  onDelete?: (id: string) => void;
  onItemClick?: (link: string) => void;
}) => {
  let [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  return (
    <div
      className={cn(
        "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 py-10 gap-4 auto-rows-fr",
        className
      )}
    >
      {items.map((item, idx) => (
        <div
          key={item?.id}
          className="relative group block p-2 h-48 w-full min-w-[200px] cursor-pointer"
          onMouseEnter={() => setHoveredIndex(idx)}
          onMouseLeave={() => setHoveredIndex(null)}
          onClick={() => onItemClick?.(item.link)}
        >
          <AnimatePresence>
            {hoveredIndex === idx && (
              <motion.span
                className="absolute inset-0 h-full w-full bg-neutral-200 dark:bg-slate-800/[0.8] block  rounded-3xl"
                layoutId="hoverBackground"
                initial={{ opacity: 0 }}
                animate={{
                  opacity: 1,
                  transition: { duration: 0.15 },
                }}
                exit={{
                  opacity: 0,
                  transition: { duration: 0.15, delay: 0.2 },
                }}
              />
            )}
          </AnimatePresence>
          <Card>
            <CardTitle>{item.title}</CardTitle>
            <CardDescription>{item.description}</CardDescription>
            {onDelete && (
              <CardActions>
                <DeleteButton 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                />
              </CardActions>
            )}
          </Card>
        </div>
      ))}
    </div>
  );
};

export const Card = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "rounded-2xl h-full w-full min-h-[180px] min-w-[180px] overflow-hidden bg-black border border-transparent dark:border-white/[0.2] group-hover:border-slate-700 relative z-20 flex flex-col",
        className
      )}
      style={{
        backgroundImage: `url(${diskSvg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Background overlay with B&W filter and low opacity */}
      <div 
        className="absolute inset-0 bg-black/60"
        style={{
          filter: 'grayscale(100%)',
          mixBlendMode: 'multiply',
        }}
      />
      
      <div className="relative z-50 flex flex-col h-full p-4">
        {children}
      </div>
    </div>
  );
};
export const CardTitle = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <h4 
      className={cn("text-zinc-100 font-bold tracking-wide text-sm leading-tight", className)}
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {children}
    </h4>
  );
};

export const CardDescription = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <p
      className={cn(
        "mt-2 text-zinc-400 tracking-wide leading-relaxed text-xs flex-1",
        className
      )}
      style={{
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}
    >
      {children}
    </p>
  );
};

export const CardActions = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <div className={cn("flex justify-end items-end mt-2", className)}>
      {children}
    </div>
  );
};

export const DeleteButton = ({
  onClick,
  className,
}: {
  onClick: (e: React.MouseEvent) => void;
  className?: string;
}) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 rounded-full hover:bg-red-500/20 text-red-400 hover:text-red-300",
        className
      )}
      title="Delete drive"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
        <line x1="10" y1="11" x2="10" y2="17" />
        <line x1="14" y1="11" x2="14" y2="17" />
      </svg>
    </button>
  );
};
