import { useDrives } from "../../contexts/DrivesContext";
import { MagicButton } from "./MagicButton";
import { useNavigate } from "react-router-dom";
import { CreateDriveModal } from "./CreateDriveModal";
import { useConfirm } from "../../../../components/ui/confirm-modal";
import { DynamicDriveGrid } from "../../../../components/ui/expandable-drive-card";
import { Drive } from "../../contexts/DrivesContext";
import Prism from "../../../../components/ui/prism";

export function DrivesList() {
  const { drives, removeDrive } = useDrives();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();

  const handleBrowseDrive = (drive: Drive) => {
    navigate(drive.link);
  };

  const handleShareDrive = (drive: Drive) => {
    // TODO: Implement share functionality
    console.log('Sharing drive:', drive.title);
  };

  const handleDeleteDrive = (drive: Drive) => {
    confirm({
      title: 'Delete Drive',
      message: `Are you sure you want to delete "${drive.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600 text-white',
      cancelButtonClass: 'bg-gray-200 text-black dark:bg-gray-700 dark:text-white',
      onConfirm: () => removeDrive(drive.id),
    });
  };

  if (drives.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center p-8 overflow-hidden relative">
        <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
          <Prism
            animationType="rotate"
            timeScale={0.5}
            height={3.5}
            baseWidth={5.5}
            scale={3.6}
            hueShift={0}
            colorFrequency={1}
            noise={0.5}
            glow={1}
          />
        </div>
        <div className="relative w-full max-w-4xl z-10">
          <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-black/90 px-8 py-20 shadow-xl">
            <h2 className="text-3xl font-bold text-white mb-4">No Drives Yet</h2>
            <p className="text-gray-400 mb-8 text-center">Create your first hyperdrive to start sharing files</p>
            <CreateDriveModal 
              triggerButton={<MagicButton>Create A Drive</MagicButton>} 
            />
          </div>
        </div>
        <ConfirmDialog />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
        <Prism
          animationType="rotate"
          timeScale={0.5}
          height={3.5}
          baseWidth={6}
          scale={2.5}
          hueShift={0}
          colorFrequency={2.7}
          noise={0.5}
          glow={1}
        />
      </div>
      <div className="relative w-full max-w-6xl flex flex-col p-8 z-10">
        <div className="relative flex h-[80vh] flex-col items-start justify-start rounded-2xl border border-gray-800 bg-black/30 px-8 py-8 shadow-xl">
          <div className="flex justify-between items-center mb-8 w-full flex-shrink-0">
            <h2 className="text-3xl font-bold text-white">Your Drives</h2>
            <CreateDriveModal 
              triggerButton={<MagicButton>Create A Drive</MagicButton>} 
            />
          </div>
          <div className="flex-1 min-h-0 w-full overflow-y-auto scrollbar-thin scrollbar-thumb-neutral-600 scrollbar-track-neutral-800 pr-2">
            <DynamicDriveGrid 
              drives={drives} 
              onBrowse={handleBrowseDrive}
              onShare={handleShareDrive}
              onDelete={handleDeleteDrive}
            />
          </div>
        </div>
      </div>
      <ConfirmDialog />
    </div>
  );
}
