import { HoverEffect } from "../../../../components/ui/card-hover-effect";
import { useDrives } from "../../contexts/DrivesContext";
import { MagicButton } from "./MagicButton";
import { useNavigate } from "react-router-dom";

export function DrivesList() {
  const { drives, addDrive } = useDrives();
  const navigate = useNavigate();

  const handleCreateDrive = () => {
    const newDrive = {
      title: `Drive ${drives.length + 1}`,
      description: 'A new hyperdrive instance',
      link: `/drive/${Date.now()}`,
      status: 'active' as const,
      size: '0 MB'
    };
    addDrive(newDrive);
  };

  if (drives.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-8 py-20 text-center">
        <h2 className="text-3xl font-bold text-white mb-4">No Drives Yet</h2>
        <p className="text-gray-400 mb-8">Create your first hyperdrive to start sharing files</p>
        <MagicButton onClick={handleCreateDrive}>
          Create A Drive
        </MagicButton>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold text-white">Your Drives</h2>
        <MagicButton onClick={handleCreateDrive}>
          Create New Drive
        </MagicButton>
      </div>
      <HoverEffect items={drives} />
    </div>
  );
}
