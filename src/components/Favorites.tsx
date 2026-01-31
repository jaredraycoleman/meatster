import { useState, useEffect, useRef } from 'react'
import { Star, ChevronDown, Trash2, Plus } from 'lucide-react'

interface Favorite {
  id: string
  name: string
  url: string
  createdAt: number
}

const STORAGE_KEY = 'kaani-favorites'

function loadFavorites(): Favorite[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveFavorites(favorites: Favorite[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites))
}

interface FavoritesProps {
  currentName: string // e.g., "Choice Cuts - Ribeye"
}

export function Favorites({ currentName }: FavoritesProps) {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Load favorites on mount
  useEffect(() => {
    setFavorites(loadFavorites())
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setIsAdding(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when adding
  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isAdding])

  const currentUrl = window.location.href

  const isCurrentSaved = favorites.some(f => f.url === currentUrl)

  const handleAddFavorite = () => {
    if (!newName.trim()) return

    const newFavorite: Favorite = {
      id: Date.now().toString(),
      name: newName.trim(),
      url: currentUrl,
      createdAt: Date.now(),
    }

    const updated = [...favorites, newFavorite]
    setFavorites(updated)
    saveFavorites(updated)
    setNewName('')
    setIsAdding(false)
  }

  const handleRemoveFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = favorites.filter(f => f.id !== id)
    setFavorites(updated)
    saveFavorites(updated)
  }

  const handleNavigate = (url: string) => {
    window.location.href = url
  }

  const startAdding = () => {
    setNewName(currentName || 'My Favorite')
    setIsAdding(true)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          isOpen
            ? 'bg-white/20 text-white'
            : 'hover:bg-white/10 text-white'
        }`}
      >
        <Star className={`w-5 h-5 ${isCurrentSaved ? 'fill-yellow-400 text-yellow-400' : ''}`} />
        <span className="hidden sm:inline text-sm font-medium">Favorites</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <p className="text-xs text-gray-500 px-2">Saved views</p>
          </div>

          {favorites.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">
              No favorites saved yet
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {favorites.map(favorite => (
                <div
                  key={favorite.id}
                  onClick={() => handleNavigate(favorite.url)}
                  className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 cursor-pointer group ${
                    favorite.url === currentUrl ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Star className={`w-4 h-4 flex-shrink-0 ${
                      favorite.url === currentUrl ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`} />
                    <span className="text-sm text-gray-700 truncate">{favorite.name}</span>
                  </div>
                  <button
                    onClick={(e) => handleRemoveFavorite(favorite.id, e)}
                    className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove favorite"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="p-2 border-t border-gray-100">
            {isAdding ? (
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddFavorite()
                    if (e.key === 'Escape') setIsAdding(false)
                  }}
                  placeholder="Favorite name..."
                  className="flex-1 px-2 py-1 text-sm text-gray-900 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleAddFavorite}
                  disabled={!newName.trim()}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={startAdding}
                disabled={isCurrentSaved}
                className={`w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
                  isCurrentSaved
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-ranch-blue hover:bg-gray-50'
                }`}
              >
                <Plus className="w-4 h-4" />
                {isCurrentSaved ? 'Current view saved' : 'Save current view'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
