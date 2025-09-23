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

interface AlertModalProps {
  title?: string;
  message: string;
  buttonText?: string;
  buttonClass?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  triggerButton?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

function AlertModalContent({
  title = "Alert",
  message,
  buttonText = "OK",
  buttonClass = "bg-blue-500 hover:bg-blue-600 text-white",
  type = 'info',
}: Omit<AlertModalProps, 'triggerButton' | 'isOpen' | 'onOpenChange'>) {
  const { setOpen } = useModal();

  const handleClose = () => {
    setOpen(false);
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: '✓',
          iconClass: 'text-green-500',
          titleClass: 'text-green-100',
        };
      case 'warning':
        return {
          icon: '⚠',
          iconClass: 'text-yellow-500',
          titleClass: 'text-yellow-100',
        };
      case 'error':
        return {
          icon: '✕',
          iconClass: 'text-red-500',
          titleClass: 'text-red-100',
        };
      default:
        return {
          icon: 'ℹ',
          iconClass: 'text-blue-500',
          titleClass: 'text-blue-100',
        };
    }
  };

  const typeStyles = getTypeStyles();

  return (
    <>
      <ModalContent>
        <div className="text-center">
          <div className={`text-4xl mb-4 ${typeStyles.iconClass}`}>
            {typeStyles.icon}
          </div>
          <h4 className={`text-lg md:text-2xl font-bold text-center mb-4 ${typeStyles.titleClass}`}>
            {title}
          </h4>
          <p className="text-neutral-400 text-center mb-6">
            {message}
          </p>
        </div>
      </ModalContent>
      <ModalFooter className="gap-4">
        <button 
          onClick={handleClose}
          className={`px-4 py-2 rounded-md text-sm ${buttonClass}`}
        >
          {buttonText}
        </button>
      </ModalFooter>
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

export function AlertModal({
  title,
  message,
  buttonText,
  buttonClass,
  type,
  triggerButton,
  isOpen,
  onOpenChange,
}: AlertModalProps) {
  return (
    <div className="flex items-center justify-center">
      <Modal>
        {triggerButton ? (
          <CustomTriggerButton>
            {triggerButton}
          </CustomTriggerButton>
        ) : (
          <ModalTrigger className="bg-black dark:bg-white dark:text-black text-white flex justify-center px-4 py-2 rounded-md">
            Open Alert
          </ModalTrigger>
        )}
        <ModalBody>
          <AlertModalContent
            title={title}
            message={message}
            buttonText={buttonText}
            buttonClass={buttonClass}
            type={type}
          />
        </ModalBody>
      </Modal>
    </div>
  );
}

// Hook for programmatic alerts
export function useAlert() {
  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    buttonText?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  }>({
    isOpen: false,
    message: '',
  });

  const alert = (options: {
    title?: string;
    message: string;
    buttonText?: string;
    type?: 'info' | 'success' | 'warning' | 'error';
  }) => {
    setAlertState({
      isOpen: true,
      ...options,
    });
  };

  const AlertDialog = () => (
    <AlertModal
      title={alertState.title}
      message={alertState.message}
      buttonText={alertState.buttonText}
      type={alertState.type}
      isOpen={alertState.isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setAlertState({ isOpen: false, message: '' });
        }
      }}
    />
  );

  return { alert, AlertDialog };
}
