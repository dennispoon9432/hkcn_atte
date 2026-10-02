import React from 'react';
import { BrandLogo } from './BrandLogo';
import { Plus, Share2, Users, Database, UserCheck } from 'lucide-react';
import { Member } from '../types';

interface NavbarProps {
  currentTab: 'upcoming' | 'all' | 'members';
  onSelectTab: (tab: 'upcoming' | 'all' | 'members') => void;
  onOpenCreate: () => void;
  onOpenShare: () => void;
  onOpenDataInfo: () => void;
  members: Member[];
  currentUserId: string | null;
  onSelectCurrentUser: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenCreate,
  onOpenShare,
  onOpenDataInfo,
  members,
  currentUserId,
  onSelectCurrentUser,
}) => {
  const currentMember = members.find((m) => m.id === currentUserId);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single Brand Lockup */}
        <div className="shrink-0 flex items-center gap-3">
          <BrandLogo size="md" showText={true} />
        </div>

        {/* Zone 2: Clean Navigation Links (Single-line, unboxed tabs) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2">
          <button
            onClick={() => onSelectTab('upcoming')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'upcoming'
                ? 'text-[#00A651] bg-emerald-50 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            即將舉行
          </button>
          <button
            onClick={() => onSelectTab('all')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              currentTab === 'all'
                ? 'text-[#00A651] bg-emerald-50 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            全部活動
          </button>
          <button
            onClick={() => onSelectTab('members')}
            className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              currentTab === 'members'
                ? 'text-[#00A651] bg-emerald-50 font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>13位社員名冊</span>
          </button>
          <button
            onClick={onOpenDataInfo}
            className="px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1"
            title="連接 Google Sheet 資料庫 (免 API)"
          >
            <Database className="w-3.5 h-3.5 text-[#00A651]" />
            <span>Google Sheet 資料庫</span>
          </button>
        </nav>

        {/* Zone 3: 1-2 Primary Actions & Identity Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Identity Quick Switcher */}
          <div className="relative flex items-center">
            <label htmlFor="user-select" className="sr-only">選擇身份</label>
            <div className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs transition-colors">
              <UserCheck className="w-3.5 h-3.5 text-[#00A651] shrink-0" />
              <select
                id="user-select"
                value={currentUserId || ''}
                onChange={(e) => onSelectCurrentUser(e.target.value)}
                className="bg-transparent text-slate-800 font-medium text-xs focus:outline-none cursor-pointer pr-1"
              >
                <option value="">我係邊位社員？</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Share Secret Link Button */}
          <button
            onClick={onOpenShare}
            className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-xs cursor-pointer"
            title="複製 WhatsApp 專屬免密碼連結"
          >
            <Share2 className="w-3.5 h-3.5 text-[#F58220]" />
            <span className="hidden sm:inline">群組專屬連結</span>
          </button>

          {/* Create Event CTA */}
          <button
            onClick={onOpenCreate}
            className="px-3.5 py-2 text-xs font-semibold text-white bg-[#00A651] hover:bg-[#008f45] rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>新建活動</span>
          </button>
        </div>
      </div>

      {/* Mobile Sub-Nav Bar */}
      <div className="flex md:hidden items-center justify-around px-2 py-1.5 border-t border-slate-100 bg-slate-50/70 text-xs">
        <button
          onClick={() => onSelectTab('upcoming')}
          className={`py-1 px-3 rounded-lg font-medium transition-colors ${
            currentTab === 'upcoming' ? 'text-[#00A651] font-bold bg-emerald-50' : 'text-slate-600'
          }`}
        >
          即將舉行
        </button>
        <button
          onClick={() => onSelectTab('all')}
          className={`py-1 px-3 rounded-lg font-medium transition-colors ${
            currentTab === 'all' ? 'text-[#00A651] font-bold bg-emerald-50' : 'text-slate-600'
          }`}
        >
          所有活動
        </button>
        <button
          onClick={() => onSelectTab('members')}
          className={`py-1 px-3 rounded-lg font-medium transition-colors ${
            currentTab === 'members' ? 'text-[#00A651] font-bold bg-emerald-50' : 'text-slate-600'
          }`}
        >
          13位社員
        </button>
        <button
          onClick={onOpenDataInfo}
          className="py-1 px-2.5 text-[#00A651] font-medium flex items-center gap-1"
        >
          <Database className="w-3 h-3 text-[#00A651]" />
          <span>Google Sheet</span>
        </button>
      </div>
    </header>
  );
};
