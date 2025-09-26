"use client";
import { useState } from "react";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalTrigger, useModal } from "../../../../components/ui/animated-modal";
import { MagicButton } from "./MagicButton";
import MagicButtonWide from "../../../../components/ui/magic-button-wide";
import { IconCopy, IconCheck, IconShare } from "@tabler/icons-react";
import QRCode from "react-qr-code";
import { AnimatePresence, motion } from "motion/react";
import { useEscapeKey } from "../../hooks/useEscapeKey";

interface ShareModalProps {
  driveKey: string;
  driveName?: string;
  triggerButton?: React.ReactNode;
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export function ShareModal({ driveKey, driveName, triggerButton, className, isOpen: externalIsOpen, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  
  // Use external isOpen if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const setIsOpen = onClose || setInternalIsOpen;

  // Add ESC key functionality
  useEscapeKey({
    onEscape: () => setIsOpen(false),
    isEnabled: isOpen
  });

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(driveKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy drive key:', error);
    }
  };

  const shareUrl = `hyperdrive://${driveKey}`;
  const displayName = driveName || 'Drive';

  return (
    <div className={className}>
      {triggerButton ? (
        <div onClick={() => setIsOpen(true)}>{triggerButton}</div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3 py-2 text-sm rounded-lg bg-neutral-800 text-neutral-200 hover:bg-neutral-700 transition-colors"
        >
          <div className="flex items-center gap-2">
            <IconShare size={16} />
            Share
          </div>
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
            {/* Custom 70% opacity overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5    }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 h-full w-full bg-black bg-opacity-70 z-40"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Modal content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ type: "spring", stiffness: 260, damping: 15 }}
              className="relative z-50 min-h-[50%] max-h-[90%] md:max-w-[40%] bg-white dark:bg-neutral-950 border border-transparent dark:border-neutral-800 md:rounded-2xl flex flex-col flex-1 overflow-hidden"
            >
              <ShareContent
                driveKey={driveKey}
                driveName={displayName}
                shareUrl={shareUrl}
                copied={copied}
                onCopyKey={handleCopyKey}
                onClose={() => setIsOpen(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShareContent({
  driveKey,
  driveName,
  shareUrl,
  copied,
  onCopyKey,
  onClose,
}: {
  driveKey: string;
  driveName: string;
  shareUrl: string;
  copied: boolean;
  onCopyKey: () => void;
  onClose: () => void;
}) {
  const [urlCopied, setUrlCopied] = useState(false);

  return (
    <>
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 group z-10"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-black dark:text-white h-4 w-4 group-hover:scale-125 group-hover:rotate-3 transition duration-200"
        >
          <path stroke="none" d="M0 0h24v24H0z" fill="none" />
          <path d="M18 6l-12 12" />
          <path d="M6 6l12 12" />
        </svg>
      </button>
      
      <ModalContent>
        <h4 className="text-lg md:text-2xl text-neutral-100 font-bold text-center mb-3">
          Share {driveName}
        </h4>
        <p className="text-neutral-400 text-center mb-6">
          Share this drive with others using the QR code or drive key below
        </p>
        
        <div className="max-w-md mx-auto w-full space-y-6">
          {/* QR Code Section */}
          <div className="text-center">
            <div className="text-white text-sm font-medium mb-3">QR Code</div>
            <div 
              className="inline-block p-4 bg-white rounded-lg shadow-lg"
              style={{ 
                background: 'white', 
                padding: '16px',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div style={{ height: "auto", margin: "0 auto", maxWidth: 200, width: "100%" }}>
                <QRCode
                  size={200}
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                  value={shareUrl}
                  viewBox={`0 0 200 200`}
                />
              </div>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Scan with Hyperdrive app to connect
            </p>
          </div>

          {/* Drive Key Section */}
          <div>
            <div className="text-white text-sm font-medium mb-3">Drive Key</div>
            <div className="relative">
              <div className="bg-black/20 border border-white/15 rounded-lg p-3 pr-12">
                <code className="text-sm text-white font-mono break-all">
                  {driveKey}
                </code>
              </div>
              <button
                onClick={onCopyKey}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-neutral-400 hover:text-white transition-colors"
                title={copied ? "Copied!" : "Copy drive key"}
              >
                {copied ? (
                  <IconCheck size={16} className="text-green-400" />
                ) : (
                  <IconCopy size={16} />
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              {copied ? "Drive key copied to clipboard!" : "Click the copy button to copy the drive key"}
            </p>
          </div>

          {/* Share URL Section */}
          <div>
            <div className="text-white text-sm font-medium mb-3">Share URL</div>
            <div className="relative">
              <div className="bg-black/20 border border-white/15 rounded-lg p-3 pr-12">
                <code className="text-sm text-white font-mono break-all">
                  {shareUrl}
                </code>
              </div>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    setUrlCopied(true);
                    setTimeout(() => setUrlCopied(false), 2000);
                  } catch (error) {
                    console.error('Failed to copy share URL:', error);
                  }
                }}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-neutral-400 hover:text-white transition-colors"
                title={urlCopied ? "Copied!" : "Copy share URL"}
              >
                {urlCopied ? (
                  <IconCheck size={16} className="text-green-400" />
                ) : (
                  <IconCopy size={16} />
                )}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Direct link to connect to this drive
            </p>
          </div>
        </div>
      </ModalContent>
      <ModalFooter>
        <MagicButtonWide
          variant="default"
          onClick={onClose}
        >
          Close
        </MagicButtonWide>
      </ModalFooter>
    </>
  );
}

export default ShareModal;
