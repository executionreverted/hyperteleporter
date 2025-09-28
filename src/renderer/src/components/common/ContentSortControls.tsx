import React from 'react'
import { SortCriteria, SortDirection } from '../../hooks/useContentSorting'
import { IconSortAscending, IconSortDescending } from '@tabler/icons-react'
import { MagicButton } from './MagicButton'
import { SelectBox } from '../../../../components/ui/selectbox'

interface ContentSortControlsProps {
  currentCriteria: SortCriteria
  currentDirection: SortDirection
  onCriteriaChange: (criteria: SortCriteria) => void
  onDirectionChange: (direction: SortDirection) => void
  className?: string
}

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'type', label: 'Type' },
  { value: 'modified', label: 'Modified' },
  { value: 'created', label: 'Created' }
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
        className="h-8"
      >
        {currentDirection === 'asc' ? (
          <IconSortAscending className="w-4 h-4" />
        ) : (
          <IconSortDescending className="w-4 h-4" />
        )}
      </MagicButton>

      {/* Sort Criteria Dropdown */}
      <SelectBox
        options={sortOptions}
        value={currentCriteria}
        onChange={(value) => onCriteriaChange(value as SortCriteria)}
        className="min-w-[100px]"
        triggerClassName="h-8"
      />
    </div>
  )
}
