"use client";
import { useState, cloneElement, isValidElement } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
  useModal,
} from "./animated-modal";

interface ConfirmModalProps {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  cancelButtonClass?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  triggerButton?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function ConfirmModalContent({
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "bg-red-500 hover:bg-red-600 text-white",
  cancelButtonClass = "bg-gray-200 text-black dark:bg-gray-700 dark:text-white",
  onConfirm,
  onCancel,
}: Omit<ConfirmModalProps, 'triggerButton' | 'isOpen' | 'onOpenChange'>) {
  const { setOpen } = useModal();

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  return (
    <>
      <ModalContent>
        <h4 className="text-lg md:text-2xl text-neutral-100 font-bold text-center mb-4">
          {title}
        </h4>
        <p className="text-neutral-400 text-center mb-6">
          {message}
        </p>
      </ModalContent>
      <ModalFooter className="gap-4">
        <button 
          onClick={handleCancel}
          className={`px-4 py-2 rounded-md text-sm ${cancelButtonClass}`}
        >
          {cancelText}
        </button>
        <button 
          onClick={handleConfirm}
          className={`px-4 py-2 rounded-md text-sm ${confirmButtonClass}`}
        >
          {confirmText}
        </button>
      </ModalFooter>
    </>
  );
}

// Separate component for programmatic usage that doesn't need ModalProvider
function ProgrammaticConfirmContent({
  title = "Confirm Action",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "bg-red-500 hover:bg-red-600 text-white",
  cancelButtonClass = "bg-gray-200 text-black dark:bg-gray-700 dark:text-white",
  onConfirm,
  onCancel,
}: Omit<ConfirmModalProps, 'triggerButton' | 'isOpen' | 'onOpenChange'>) {
  const handleConfirm = () => {
    onConfirm();
  };

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <>
      <div className="flex flex-col flex-1 p-8 md:p-10">
        <h4 className="text-lg md:text-2xl text-neutral-100 font-bold text-center mb-4">
          {title}
        </h4>
        <p className="text-neutral-400 text-center mb-6">
          {message}
        </p>
      </div>
      <div className="flex justify-end p-4 bg-gray-100 dark:bg-neutral-900 gap-4">
        <button 
          onClick={handleCancel}
          className={`px-4 py-2 rounded-md text-sm ${cancelButtonClass}`}
        >
          {cancelText}
        </button>
        <button 
          onClick={handleConfirm}
          className={`px-4 py-2 rounded-md text-sm ${confirmButtonClass}`}
        >
          {confirmText}
        </button>
      </div>
    </>
  );
}

function CustomTriggerButton({ children }: { children: React.ReactNode }) {
  const { setOpen } = useModal();
  
  if (isValidElement(children)) {
    const originalOnClick = (children.props as any)?.onClick;
    return cloneElement(children, {
      onClick: (e: React.MouseEvent) => {
        if (originalOnClick && typeof originalOnClick === 'function') {
          originalOnClick(e);
        }
        setOpen(true);
      }
    } as any);
  }
  
  return <div onClick={() => setOpen(true)}>{children}</div>;
}

export function ConfirmModal({
  title,
  message,
  confirmText,
  cancelText,
  confirmButtonClass,
  cancelButtonClass,
  onConfirm,
  onCancel,
  triggerButton,
  isOpen,
  onOpenChange,
}: ConfirmModalProps) {
  // If no triggerButton is provided, don't render the modal at all
  // This is for programmatic usage only
  if (!triggerButton) {
    return null;
  }

  return (
    <div className="flex items-center justify-center">
      <Modal>
        <CustomTriggerButton>
          {triggerButton}
        </CustomTriggerButton>
        <ModalBody>
          <ConfirmModalContent
            title={title}
            message={message}
            confirmText={confirmText}
            cancelText={cancelText}
            confirmButtonClass={confirmButtonClass}
            cancelButtonClass={cancelButtonClass}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        </ModalBody>
      </Modal>
    </div>
  );
}

// Hook for programmatic confirmation
export function useConfirm() {
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
    cancelButtonClass?: string;
    onConfirm?: () => void | Promise<void>;
    onCancel?: () => void;
  }>({
    isOpen: false,
    message: '',
  });

  const confirm = (options: {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmButtonClass?: string;
    cancelButtonClass?: string;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
  }) => {
    setConfirmState({
      isOpen: true,
      ...options,
    });
  };

  const ConfirmDialog = () => {
    if (!confirmState.isOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmState({ isOpen: false, message: '' })} />
        <div className="relative z-50 min-h-[50%] max-h-[90%] md:max-w-[40%] bg-white dark:bg-neutral-950 border border-transparent dark:border-neutral-800 md:rounded-2xl flex flex-col flex-1 overflow-hidden">
          <ProgrammaticConfirmContent
            title={confirmState.title}
            message={confirmState.message}
            confirmText={confirmState.confirmText}
            cancelText={confirmState.cancelText}
            confirmButtonClass={confirmState.confirmButtonClass}
            cancelButtonClass={confirmState.cancelButtonClass}
            onConfirm={async () => {
              try {
                await confirmState.onConfirm?.();
              } catch (error) {
                console.error('Confirm action failed:', error);
              } finally {
                setConfirmState({ isOpen: false, message: '' });
              }
            }}
            onCancel={() => {
              confirmState.onCancel?.();
              setConfirmState({ isOpen: false, message: '' });
            }}
          />
        </div>
      </div>
    );
  };

  return { confirm, ConfirmDialog };
}
