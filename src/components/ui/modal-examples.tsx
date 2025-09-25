/**
 * Examples of how to use ConfirmModal and AlertModal components
 */

import { ConfirmModal, useConfirm } from './confirm-modal';
import { AlertModal, useAlert } from './alert-modal';
import { MagicButton } from '../../renderer/src/components/common/MagicButton';

// Example 1: Using ConfirmModal with a trigger button
export function ConfirmModalExample() {
  const handleConfirm = () => {
    console.log('User confirmed the action');
  };

  const handleCancel = () => {
    console.log('User cancelled the action');
  };

  return (
    <ConfirmModal
      title="Delete Item"
      message="Are you sure you want to delete this item? This action cannot be undone."
      confirmText="Delete"
      cancelText="Cancel"
      confirmButtonClass="bg-red-500 hover:bg-red-600 text-white"
      cancelButtonClass="bg-gray-200 text-black dark:bg-gray-700 dark:text-white"
      onConfirm={handleConfirm}
      onCancel={handleCancel}
      triggerButton={<MagicButton>Delete Item</MagicButton>}
    />
  );
}

// Example 2: Using AlertModal with different types
export function AlertModalExamples() {
  return (
    <div className="space-x-4">
      <AlertModal
        title="Success!"
        message="Your changes have been saved successfully."
        type="success"
        triggerButton={<MagicButton>Success Alert</MagicButton>}
      />
      
      <AlertModal
        title="Warning"
        message="This action may have unintended consequences."
        type="warning"
        triggerButton={<MagicButton>Warning Alert</MagicButton>}
      />
      
      <AlertModal
        title="Error"
        message="Something went wrong. Please try again."
        type="error"
        triggerButton={<MagicButton>Error Alert</MagicButton>}
      />
    </div>
  );
}

// Example 3: Using hooks for programmatic modals
export function ProgrammaticModalExample() {
  const { confirm, ConfirmDialog } = useConfirm();
  const { alert, AlertDialog } = useAlert();

  const handleDelete = () => {
    confirm({
      title: 'Delete Drive',
      message: 'Are you sure you want to delete this drive? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600 text-white',
      onConfirm: () => {
        // Perform delete action
        console.log('Drive deleted');
        // Show success alert
        alert({
          title: 'Success',
          message: 'Drive deleted successfully!',
          type: 'success',
        });
      },
    });
  };

  const handleSave = () => {
    // Simulate save operation
    alert({
      title: 'Success',
      message: 'Your changes have been saved!',
      type: 'success',
    });
  };

  return (
    <div className="space-x-4">
      <button 
        onClick={handleDelete}
        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Delete Drive
      </button>
      
      <button 
        onClick={handleSave}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Save Changes
      </button>
      
      {/* These dialogs handle the programmatic modals */}
      <ConfirmDialog />
      <AlertDialog />
    </div>
  );
}
