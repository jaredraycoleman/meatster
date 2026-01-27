import { Beef, Github } from 'lucide-react'
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
              <h1 className="text-2xl font-bold">Meatster</h1>
              <p className="text-sm text-blue-200">
                USDA Beef Price Analytics for Harris Ranch
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
            <a
              href="https://github.com/jaredgoldman/meatster"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="View on GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}
