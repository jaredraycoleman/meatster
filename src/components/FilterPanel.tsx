import { useMemo, useState } from 'react'
import { Calendar, ChevronDown, ChevronUp, Filter } from 'lucide-react'
import { SearchableSelect } from './SearchableSelect'
import type { Report, Section } from '@/types'
import { format } from 'date-fns'

interface FilterPanelProps {
  reports: Report[]
  sections: Section[]
  items: string[]
  selectedReport: string | null
  selectedSection: string | null
  selectedItem: string | null
  startDate: Date
  endDate: Date
  onReportChange: (id: string) => void
  onSectionChange: (id: string) => void
  onItemChange: (item: string) => void
  onStartDateChange: (date: Date) => void
  onEndDateChange: (date: Date) => void
  isLoading: boolean
}

export function FilterPanel({
  reports,
  sections,
  items,
  selectedReport,
  selectedSection,
  selectedItem,
  startDate,
  endDate,
  onReportChange,
  onSectionChange,
  onItemChange,
  onStartDateChange,
  onEndDateChange,
  isLoading,
}: FilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true) // Collapsed by default on mobile

  const reportOptions = useMemo(
    () =>
      reports.map(report => ({
        value: report.slug_id,
        label: report.report_title || report.slug_name,
      })),
    [reports]
  )

  const sectionOptions = useMemo(
    () =>
      sections.map(section => ({
        value: section.slug_name,
        label: section.slug_name,
      })),
    [sections]
  )

  const itemOptions = useMemo(
    () =>
      items.map(item => ({
        value: item,
        label: item,
      })),
    [items]
  )

  // Build summary text for collapsed state
  const summaryText = useMemo(() => {
    const parts: string[] = []
    if (selectedSection) parts.push(selectedSection)
    if (selectedItem) parts.push(selectedItem)
    return parts.length > 0 ? parts.join(' › ') : 'Select filters'
  }, [selectedSection, selectedItem])

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      {/* Mobile collapsed header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="sm:hidden flex items-center justify-between w-full text-left mb-2"
      >
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-900">Filters</span>
          <span className="text-sm text-gray-500 truncate max-w-[200px]">{summaryText}</span>
        </div>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-gray-500" />
        ) : (
          <ChevronUp className="w-5 h-5 text-gray-500" />
        )}
      </button>

      {/* Filter content - hidden on mobile when collapsed */}
      <div className={`${isCollapsed ? 'hidden' : 'block'} sm:block`}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Report Select */}
        <SearchableSelect
          label="Report"
          options={reportOptions}
          value={selectedReport}
          onChange={onReportChange}
          placeholder="Select a report"
          disabled={isLoading}
        />

        {/* Section Select */}
        <SearchableSelect
          label="Section"
          options={sectionOptions}
          value={selectedSection}
          onChange={onSectionChange}
          placeholder="Select a section"
          disabled={!selectedReport || isLoading}
        />

        {/* Item Select */}
        <SearchableSelect
          label="Cut / Item"
          options={itemOptions}
          value={selectedItem}
          onChange={onItemChange}
          placeholder="All items"
          disabled={!selectedSection || isLoading}
        />

        {/* Start Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={format(startDate, 'yyyy-MM-dd')}
              onChange={e => onStartDateChange(new Date(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-beef-red focus:border-transparent"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* End Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <div className="relative">
            <input
              type="date"
              value={format(endDate, 'yyyy-MM-dd')}
              onChange={e => onEndDateChange(new Date(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-beef-red focus:border-transparent"
            />
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
