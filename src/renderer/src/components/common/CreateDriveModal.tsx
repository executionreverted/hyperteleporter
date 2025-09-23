"use client";
import { useState, cloneElement, isValidElement } from "react";
import {
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalTrigger,
  useModal,
} from "../../../../components/ui/animated-modal";
import { CreateDriveForm, type CreateDriveValues } from "./CreateDrive";
import { useDrives } from "../../contexts/DrivesContext";

function CreateDriveModalContent() {
  const { addDrive } = useDrives();
  const { setOpen } = useModal();

  const handleCreate = (values: CreateDriveValues) => {
    addDrive({
      title: values.name,
      description: values.description || "",
      link: `/drive/${Date.now()}`,
      status: "active",
      size: "0 MB",
    });
    setOpen(false); // Close the modal after creating drive
  };

  const handleCancel = () => {
    setOpen(false); // Close the modal when cancel is clicked
  };

  return (
    <>
      <ModalContent>
        <h4 className="text-lg md:text-2xl text-neutral-100 font-bold text-center mb-4">
          Create a new Drive
        </h4>
        <p className="text-neutral-400 text-center mb-6">
          Name your Hyperdrive and add an optional description.
        </p>
        <div className="max-w-md mx-auto w-full">
          <CreateDriveForm onSubmit={handleCreate} />
        </div>
      </ModalContent>
      <ModalFooter className="gap-4">
        <button 
          onClick={handleCancel}
          className="px-3 py-2 bg-gray-200 text-black dark:bg-black dark:border-black dark:text-white border border-gray-300 rounded-md text-sm"
        >
          Cancel
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
        // Call the original onClick if it exists
        if (originalOnClick && typeof originalOnClick === 'function') {
          originalOnClick(e);
        }
        // Open the modal
        setOpen(true);
      }
    } as any);
  }
  
  return <div onClick={() => setOpen(true)}>{children}</div>;
}

/**
 * CreateDriveModal - A modal for creating new drives
 * 
 * @param triggerButton - Optional custom button component to trigger the modal.
 *                        If not provided, uses the default "Create A Drive" button.
 * 
 * @example
 * // Using default button
 * <CreateDriveModal />
 * 
 * @example
 * // Using custom button
 * <CreateDriveModal 
 *   triggerButton={
 *     <button className="custom-button">
 *       Add New Drive
 *     </button>
 *   } 
 * />
 */
export function CreateDriveModal({ 
  triggerButton 
}: { 
  triggerButton?: React.ReactNode 
}) {
  return (
    <div className="flex items-center justify-center">
      <Modal>
        {triggerButton ? (
          <CustomTriggerButton>
            {triggerButton}
          </CustomTriggerButton>
        ) : (
          <ModalTrigger className="bg-black dark:bg-white dark:text-black text-white flex justify-center px-4 py-2 rounded-md">
            Create A Drive
          </ModalTrigger>
        )}
        <ModalBody>
          <CreateDriveModalContent />
        </ModalBody>
      </Modal>
    </div>
  );
}
