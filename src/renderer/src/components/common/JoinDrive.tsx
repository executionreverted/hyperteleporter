"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import MagicButtonWide from "../../../../components/ui/magic-button-wide";
import { useDrives } from "../../contexts/DrivesContext";

interface JoinDriveProps {
  triggerButton?: React.ReactNode;
  className?: string;
}

export function JoinDrive({ triggerButton, className }: JoinDriveProps) {
  const { joinReadOnlyDrive } = useDrives();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !key.trim()) {
      setError("Name and drive key are required");
      return;
    }
    if (!/^[0-9a-fA-F]+$/.test(key) || key.length % 2 !== 0) {
      setError("Drive key must be a valid hex string");
      return;
    }
    try {
      setSubmitting(true);
      await joinReadOnlyDrive(name.trim(), key.trim());
      setIsOpen(false);
      setName("");
      setKey("");
    } catch {
      setError("Failed to join drive. Please verify the key and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={className}>
      {triggerButton ? (
        <div onClick={() => setIsOpen(true)}>{triggerButton}</div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-2 text-sm rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors"
        >
          Join Drive
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 h-full w-full flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-full w-full bg-black bg-opacity-70 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 15 }}
              className="relative z-50 min-h-[50%] max-h-[90%] md:max-w-[40%] bg-white dark:bg-neutral-950 border border-transparent dark:border-neutral-800 md:rounded-2xl flex flex-col flex-1 overflow-hidden"
            >
              <div className="flex flex-col flex-1 p-8 md:p-10">
                <h4 className="text-lg md:text-2xl text-neutral-100 font-bold text-center mb-4">Join a Drive</h4>
                <p className="text-neutral-400 text-center mb-6">Enter a name and the drive public key (hex).</p>

                <form onSubmit={onSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm text-neutral-300 mb-1">Name</label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-black/30 border border-white/10 text-white outline-none focus:ring-2 focus:ring-white/20"
                      placeholder="My friend’s drive"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-300 mb-1">Drive Key (hex)</label>
                    <input
                      value={key}
                      onChange={(e) => setKey(e.target.value)}
                      className="w-full px-3 py-2 rounded-md bg-black/30 border border-white/10 text-white outline-none focus:ring-2 focus:ring-white/20 font-mono"
                      placeholder="e.g. a3b4..."
                    />
                    {error && <p className="text-red-400 text-xs mt-2">{error}</p>}
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-3 py-2 bg-gray-200 text-black dark:bg-black dark:border-black dark:text-white border border-gray-300 rounded-md text-sm"
                    >
                      Cancel
                    </button>
                    <MagicButtonWide
                      type="submit"
                      disabled={submitting}
                    >
                      {submitting ? 'Joining…' : 'Join Drive'}
                    </MagicButtonWide>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default JoinDrive;


