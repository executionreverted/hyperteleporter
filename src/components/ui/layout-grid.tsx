"use client";
import * as React from "react";
import { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { cn } from "../../renderer/lib/utils";

export const LayoutGrid = ({ cards }: { cards: any[] }) => {
  const [selected, setSelected] = useState<string | null>(null);
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  const handleClick = (card: any) => {
    setLastSelected(selected);
    setSelected(card.id);
  };

  const handleOutsideClick = () => {
    setLastSelected(selected);
    setSelected(null);
  };

  return (
    <div className="w-full h-full p-10 grid grid-cols-1 md:grid-cols-3 max-w-7xl mx-auto gap-4">
      {cards.map((card, i) => (
        <div key={i} className={cn(card.className, "")}>
          <motion.div
            onClick={() => handleClick(card)}
            className={cn(
              "relative overflow-hidden",
              selected === card.id
                ? "rounded-lg cursor-pointer absolute inset-0 h-1/2 w-full md:w-1/2 m-auto z-50 flex justify-center items-center flex-wrap flex-col"
                : lastSelected === card.id
                ? "z-40 bg-white rounded-xl h-full w-full"
                : "bg-white rounded-xl h-full w-full cursor-pointer"
            )}
            layout
          >
            {selected === card.id && (
              <motion.div
                onClick={handleOutsideClick}
                className="absolute inset-0 bg-black/20 z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
            )}
            <BlurImage card={card} />
            {selected === card.id && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="relative z-20"
              >
                {card.content}
              </motion.div>
            )}
          </motion.div>
        </div>
      ))}
    </div>
  );
};

const BlurImage = ({ card }: { card: any }) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <img
      src={card.thumbnail}
      height="500"
      width="500"
      onLoad={() => setLoaded(true)}
      className={cn(
        "object-cover object-top absolute inset-0 h-full w-full transition duration-700",
        loaded ? "blur-none" : "blur-md"
      )}
      alt="thumbnail"
    />
  );
};