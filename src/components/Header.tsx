import { Beef } from 'lucide-react'
import { Favorites } from './Favorites'

interface HeaderProps {
  dataAsOf: string | null
  currentViewName?: string
}

export function Header({ dataAsOf, currentViewName }: HeaderProps) {
  return (
    <header className="bg-gradient-to-r from-ranch-blue to-ranch-light text-white shadow-lg">
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Beef className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Kaani</h1>
              <p className="text-sm text-blue-200">
                USDA Beef Price Analytics
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {dataAsOf && (
              <span className="text-sm text-blue-200 hidden md:block mr-2">
                Data as of: {dataAsOf}
              </span>
            )}
            <Favorites currentName={currentViewName || ''} />
          </div>
        </div>
      </div>
    </header>
  )
}
