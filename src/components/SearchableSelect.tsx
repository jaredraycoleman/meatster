import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Search, X } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  options: Option[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  label: string
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  label,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find(o => o.value === value)

  const filteredOptions = useMemo(() => {
    if (!search) return options
    const searchLower = search.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(searchLower))
  }, [options, search])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSelect = (optionValue: string) => {
    onChange(optionValue)
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      setSearch('')
    } else if (e.key === 'Enter' && filteredOptions.length === 1) {
      handleSelect(filteredOptions[0].value)
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full flex items-center justify-between bg-white border border-gray-300 rounded-md py-2 pl-3 pr-3 text-sm text-left focus:outline-none focus:ring-2 focus:ring-beef-red focus:border-transparent ${
            disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : 'cursor-pointer'
          }`}
        >
          <span className={selectedOption ? 'text-gray-900' : 'text-gray-500'}>
            {selectedOption?.label || placeholder}
          </span>
          <div className="flex items-center gap-1">
            {value && !disabled && (
              <X
                className="w-4 h-4 text-gray-400 hover:text-gray-600"
                onClick={handleClear}
              />
            )}
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm text-gray-900 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No results found</div>
              ) : (
                filteredOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                      option.value === value ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
