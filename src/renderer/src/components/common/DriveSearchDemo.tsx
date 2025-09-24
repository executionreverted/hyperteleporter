"use client";

import { DriveSearchInput } from "../../../../components/ui/drive-search-input";
import { useDrives } from "../../contexts/DrivesContext";
import { useNavigate } from "react-router-dom";

export function DriveSearchDemo() {
  const { drives } = useDrives();
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    console.log("Searching for:", query);
    // You can implement additional search logic here
  };

  const handleSelectDrive = (drive: any) => {
    console.log("Selected drive:", drive);
    // Navigate to the selected drive
    navigate(drive.link);
  };

  return (
    <div className="h-[20rem] flex flex-col justify-center items-center px-4">
      <h2 className="mb-8 text-2xl text-center sm:text-4xl text-white">
        Search Your Hyperdrives
      </h2>
      <DriveSearchInput
        drives={drives}
        onSearch={handleSearch}
        onSelectDrive={handleSelectDrive}
      />
    </div>
  );
}
