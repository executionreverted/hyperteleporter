import { HoverEffect } from "../../../../components/ui/card-hover-effect";
import { Meteors } from "../../../../components/ui/meteors";
import { useDrives } from "../../contexts/DrivesContext";
import { MagicButton } from "./MagicButton";
import { useNavigate } from "react-router-dom";
import { CreateDriveModal } from "./CreateDriveModal";
import { useConfirm } from "../../../../components/ui/confirm-modal";

export function DrivesList() {
  const { drives, removeDrive } = useDrives();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();

  const handleDriveClick = (link: string) => {
    navigate(link);
  };

  const handleDeleteDrive = (id: string) => {
    confirm({
      title: 'Delete Drive',
      message: 'Are you sure you want to delete this drive? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600 text-white',
      cancelButtonClass: 'bg-gray-200 text-black dark:bg-gray-700 dark:text-white',
      onConfirm: () => removeDrive(id),
    });
  };

  if (drives.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8">
        <div className="relative w-full max-w-4xl">
          <div className="absolute inset-0 h-full w-full transform rounded-2xl bg-gradient-to-r from-blue-500 to-teal-500 blur-3xl" />
          <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-black px-8 py-20 shadow-xl">
            <h2 className="text-3xl font-bold text-white mb-4">No Drives Yet</h2>
            <p className="text-gray-400 mb-8 text-center">Create your first hyperdrive to start sharing files</p>
            <CreateDriveModal 
              triggerButton={<MagicButton>Create A Drive</MagicButton>} 
            />
            <Meteors number={20} />
          </div>
        </div>
        <ConfirmDialog />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="relative w-full max-w-6xl mx-auto">
        <div className="absolute inset-0 h-full w-full transform rounded-2xl bg-gradient-to-r from-blue-500 to-teal-500 blur-3xl" />
        <div className="relative flex h-full flex-col items-start justify-start overflow-hidden rounded-2xl border border-gray-800 bg-black px-8 py-8 shadow-xl">
          <div className="flex justify-between items-center mb-8 w-full">
            <h2 className="text-3xl font-bold text-white">Your Drives</h2>
            <CreateDriveModal 
              triggerButton={<MagicButton>Create A Drive</MagicButton>} 
            />
          </div>
          <HoverEffect 
            items={drives} 
            onDelete={handleDeleteDrive}
            onItemClick={handleDriveClick}
          />
          <Meteors number={20} />
        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
}
