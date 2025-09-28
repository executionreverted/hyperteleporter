import React from 'react'
import { SortCriteria, SortDirection } from '../../hooks/useContentSorting'
import { IconSortAscending, IconSortDescending, IconChevronDown } from '@tabler/icons-react'
import { MagicButton } from './MagicButton'

interface ContentSortControlsProps {
  currentCriteria: SortCriteria
  currentDirection: SortDirection
  onCriteriaChange: (criteria: SortCriteria) => void
  onDirectionChange: (direction: SortDirection) => void
  className?: string
}

const sortOptions: { value: SortCriteria; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'type', label: 'Type' },
  { value: 'modified', label: 'Modified' }
]

export function ContentSortControls({
  currentCriteria,
  currentDirection,
  onCriteriaChange,
  onDirectionChange,
  className = ''
}: ContentSortControlsProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Sort Direction Toggle */}
      <MagicButton
        variant="default"
        onClick={() => onDirectionChange(currentDirection === 'asc' ? 'desc' : 'asc')}
        className="px-3 py-1.5 h-8"
      >
        {currentDirection === 'asc' ? (
          <IconSortAscending className="w-4 h-4" />
        ) : (
          <IconSortDescending className="w-4 h-4" />
        )}
      </MagicButton>

      {/* Sort Criteria Dropdown */}
      <div className="relative">
        <select
          value={currentCriteria}
          onChange={(e) => onCriteriaChange(e.target.value as SortCriteria)}
          className="appearance-none bg-neutral-800 hover:bg-neutral-700 text-white text-sm px-3 py-1.5 pr-8 rounded-lg border border-neutral-600 focus:border-blue-500 focus:outline-none transition-colors h-8 min-w-[100px]"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <IconChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
      </div>
    </div>
  )
}
