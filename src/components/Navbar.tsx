import {
  MessageSquare,
  ShieldAlert,
  FileText,
  Octagon,
  Search,
  Users,
  Globe,
} from "lucide-react";
import { ThemeToggle } from './ThemeToggle';
import { useTranslation } from '../contexts/TranslationContext';
import { SUPPORTED_LANGUAGES } from '../utils/translations';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  currentPage: 'dashboard' | 'entity-screening' | 'common-entities' | 'blacklist' | 'sdn-list' | 'reports';
  onNavigate: (page: 'dashboard' | 'entity-screening' | 'common-entities' | 'blacklist' | 'sdn-list' | 'reports') => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onLanguageChange: (lang: string) => void;
}

export function Navbar({ currentPage, onNavigate, isDark, onToggleTheme, onLanguageChange }: NavbarProps) {
  const navigate = useNavigate();

  const handleNavigation = (page: typeof currentPage) => {
    onNavigate(page);
    navigate(`/${page}`);
  };

  return (
    <nav className="bg-[#008766] shadow-lg dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <span className="text-xl font-bold text-white tracking-wide">
              SWIFT Message Checker
            </span>
          </div>
          <div className="flex items-center space-x-2">
            {/* SWIFT Messages */}
            <button
              onClick={() => handleNavigation('dashboard')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium tracking-wide text-white ${
                currentPage === 'dashboard'
                  ? 'bg-[#007055]'
                  : 'hover:bg-[#007055]'
              }`}
            >
              <MessageSquare className="w-4 h-4 mr-1.5" />
              SWIFT Messages
            </button>

            {/* Entity Verification */}
            <button
              onClick={() => handleNavigation('entity-screening')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium tracking-wide text-white ${
                currentPage === 'entity-screening'
                  ? 'bg-[#007055]'
                  : 'hover:bg-[#007055]'
              }`}
            >
              <Search className="w-4 h-4 mr-1.5" />
              Entity Verification
            </button>

            {/* Common Entities */}
            <button
              onClick={() => handleNavigation('common-entities')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium tracking-wide text-white ${
                currentPage === 'common-entities'
                  ? 'bg-[#007055]'
                  : 'hover:bg-[#007055]'
              }`}
            >
              <Users className="w-4 h-4 mr-1.5" />
              Common Entities
            </button>

            {/* Internal Blacklist */}
            <button
              onClick={() => handleNavigation('blacklist')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium tracking-wide text-white ${
                currentPage === 'blacklist'
                  ? 'bg-[#007055]'
                  : 'hover:bg-[#007055]'
              }`}
            >
              <ShieldAlert className="w-4 h-4 mr-1.5" />
              Internal Blacklist
            </button>

            {/* OFAC SDN List */}
            <button
              onClick={() => handleNavigation('sdn-list')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium tracking-wide text-white ${
                currentPage === 'sdn-list'
                  ? 'bg-[#007055]'
                  : 'hover:bg-[#007055]'
              }`}
            >
              <Octagon className="w-4 h-4 mr-1.5" />
              OFAC SDN List
            </button>

            {/* Analytics & Reports */}
            <button
              onClick={() => handleNavigation('reports')}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium tracking-wide text-white ${
                currentPage === 'reports'
                  ? 'bg-[#007055]'
                  : 'hover:bg-[#007055]'
              }`}
            >
              <FileText className="w-4 h-4 mr-1.5" />
              Analytics & Reports
            </button>

            <div className="border-l border-[#007055] h-6 mx-2" />

            {/* Language Selector */}
            <div className="relative group">
              <button className="flex items-center px-2 py-1.5 rounded-md text-sm font-medium text-white hover:bg-[#007055]">
                <Globe className="w-4 h-4 mr-1.5" />
                Language
              </button>
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-700 ring-1 ring-black ring-opacity-5 hidden group-hover:block">
                <div className="py-1">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => onLanguageChange(lang)}
                      className="block w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      {lang === 'en' ? 'English' : 'Russian'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
          </div>
        </div>
      </div>
    </nav>
  );
}
