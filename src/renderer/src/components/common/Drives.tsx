import { useDrives } from "../../contexts/DrivesContext";
import { MagicButton } from "./MagicButton";
import { useNavigate } from "react-router-dom";
import { CreateDriveModal } from "./CreateDriveModal";
import { JoinDrive } from "./JoinDrive";
import { useConfirm } from "../../../../components/ui/confirm-modal";
import { StaticDriveGrid } from "../../../../components/ui/static-drive-grid";
import { Drive } from "../../contexts/DrivesContext";
import Prism from "../../../../components/ui/prism";
import { DriveSearchInput } from "../../../../components/ui/drive-search-input";
import { memo, useMemo, useState } from "react";
import GradualBlur from "../../../../components/ui/GradualBlur";
// Optimized Prism background component
const PrismBackground = memo(() => (
  <div className="absolute inset-0 w-full h-full">
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
      suspendWhenOffscreen={true}
    />
  </div>
));

PrismBackground.displayName = 'PrismBackground';

const DrivesList = memo(function DrivesList() {
  const { drives, removeDrive } = useDrives();
  const navigate = useNavigate();
  const { confirm, ConfirmDialog } = useConfirm();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredDrives, setFilteredDrives] = useState<Drive[]>(drives);

  const handleBrowseDrive = useMemo(() => (drive: Drive) => {
    const path = drive.link && drive.link.trim().length > 0 ? drive.link : `/drive/${drive.id}`;
    navigate(path);
  }, [navigate]);

  const handleShareDrive = useMemo(() => (drive: Drive) => {
    // TODO: Implement share functionality
    console.log('Sharing drive:', drive.title);
  }, []);

  const handleDeleteDrive = useMemo(() => (drive: Drive) => {
    confirm({
      title: 'Delete Drive',
      message: `Are you sure you want to delete "${drive.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmButtonClass: 'bg-red-500 hover:bg-red-600 text-white',
      cancelButtonClass: 'bg-gray-200 text-black dark:bg-gray-700 dark:text-white',
      onConfirm: () => removeDrive(drive.id),
    });
  }, [confirm, removeDrive]);

  // Search handlers
  const handleSearch = useMemo(() => (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      const filtered = drives.filter(drive =>
        drive.title.toLowerCase().includes(query.toLowerCase()) ||
        drive.description?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredDrives(filtered);
    } else {
      setFilteredDrives(drives);
    }
  }, [drives]);

  const handleSelectDrive = useMemo(() => (drive: Drive) => {
    navigate(drive.link);
  }, [navigate]);

  // Update filtered drives when drives change
  useMemo(() => {
    if (searchQuery.trim()) {
      const filtered = drives.filter(drive =>
        drive.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        drive.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredDrives(filtered);
    } else {
      setFilteredDrives(drives);
    }
  }, [drives, searchQuery]);

  if (drives.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center p-8 overflow-hidden relative">
        <PrismBackground />
        <div className="relative w-full max-w-4xl z-10">
          <div className="relative flex h-full flex-col items-center justify-center overflow-hidden rounded-2xl border border-gray-800 bg-black/90 px-8 py-20 shadow-xl">
            <h2 className="text-3xl font-bold text-white mb-4">No Drives Yet</h2>
            <p className="text-gray-400 mb-8 text-center">Create your first hyperdrive to start sharing files</p>
            <div className="flex items-center gap-3">
              <JoinDrive triggerButton={<MagicButton>Join A Drive</MagicButton>} />
              <CreateDriveModal 
                triggerButton={<MagicButton>Create A Drive</MagicButton>} 
              />
            </div>
          </div>
        </div>
        <ConfirmDialog />
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex items-center justify-center overflow-hidden relative">
      <PrismBackground />
      <div className="relative w-full max-w-6xl flex flex-col p-8 z-10">
        <div className="relative flex h-[85vh] flex-col items-center justify-start rounded-2xl border border-gray-800 bg-black/30 px-8 py-8 shadow-xl">
          <div className="flex justify-between items-center mb-6 w-full flex-shrink-0">
            <div className="flex items-center space-x-6 flex-1">
              <h2 className="text-2xl font-bold text-white flex-shrink-0">Your Drives</h2>
              <div className="flex-1 max-w-2xl flex items-center">
                <DriveSearchInput
                  drives={drives}
                  onSearch={handleSearch}
                  onSelectDrive={handleSelectDrive}
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <JoinDrive triggerButton={<MagicButton>Join A Drive</MagicButton>} />
              <CreateDriveModal 
                triggerButton={<MagicButton>Create A Drive</MagicButton>} 
              />
            </div>
          </div>

          <div 
            className="flex-1 min-h-0 w-full overflow-y-auto relative"
            style={{
              scrollbarWidth: 'none', /* Firefox */
              msOverflowStyle: 'none', /* IE and Edge */
              // @ts-ignore vendor property for webkit
              WebkitScrollbar: 'none', /* Chrome, Safari, Opera */
            }}
          >
            {filteredDrives.length > 0 ? (
              <StaticDriveGrid 
                drives={filteredDrives} 
                onBrowse={handleBrowseDrive}
                onShare={handleShareDrive}
                onDelete={handleDeleteDrive}
              />
            ) : searchQuery ? (
              <div className="flex flex-col items-center justify-center h-64 text-white/60">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <p className="text-xl mb-2">No drives found</p>
                <p className="text-sm">Try searching with different keywords</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-white/60">
                <svg className="w-16 h-16 mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
                <p className="text-xl mb-2">No drives yet</p>
                <p className="text-sm">Create your first drive to get started</p>
              </div>
            )}
            
         
          </div>
          <GradualBlur
              target="parent"
              position="bottom"
              height="6rem"
              strength={2}
              divCount={12}
              curve="bezier"
              exponential={true}
              opacity={1}
            />
        </div>
        
      </div>
      <ConfirmDialog />
    </div>
  );
});

export { DrivesList };
