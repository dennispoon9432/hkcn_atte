import React, { useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { KeyRound, ShieldCheck, ArrowRight, MessageCircle } from 'lucide-react';

interface AccessGateProps {
  onUnlock: (token: string) => void;
  defaultToken: string;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onUnlock, defaultToken }) => {
  const [inputToken, setInputToken] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputToken.trim().toLowerCase();
    if (clean === defaultToken.toLowerCase() || clean === 'hkcn' || clean === 'citynorth') {
      onUnlock(clean);
    } else {
      setError(true);
    }
  };

  const handleQuickBypass = () => {
    onUnlock(defaultToken || 'hkcn');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200/80 p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size="lg" showText={false} className="mb-4" />
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            香港城北扶青社
          </h1>
          <p className="text-sm font-medium text-[#00A651] mt-0.5">
            活動出席及報名系統
          </p>

          <div className="mt-5 p-4 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-left text-xs text-slate-700 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-emerald-800 mb-1">
              <ShieldCheck className="w-4 h-4 text-[#00A651] shrink-0" />
              <span>社員免密碼專屬連結</span>
            </div>
            為保護城北扶青社員名單及活動隱私，本系統專供本社使用。社員通常只需直接在{' '}
            <strong className="text-emerald-900">WhatsApp 群組</strong> 點擊幹事分享的專屬連結，即可直接進入，無需輸入密碼。
          </div>

          <form onSubmit={handleSubmit} className="w-full mt-6 space-y-4">
            <div>
              <label htmlFor="token-input" className="block text-xs font-semibold text-slate-700 text-left mb-1.5">
                通關識別碼 (Token)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4" />
                </div>
                <input
                  id="token-input"
                  type="text"
                  value={inputToken}
                  onChange={(e) => {
                    setInputToken(e.target.value);
                    if (error) setError(false);
                  }}
                  placeholder="請輸入識別碼 (例如: hkcn)"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#00A651] focus:bg-white transition-all text-slate-800"
                />
              </div>
              {error && (
                <p className="text-xs text-rose-600 mt-1.5 text-left font-medium">
                  識別碼不正確，請向幹事索取或點擊下方直接通行。
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#00A651] hover:bg-[#008f45] text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              <span>驗證並進入系統</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="relative w-full my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">或者</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickBypass}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-medium rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-3.5 h-3.5 text-[#F58220]" />
            <span>我是城北社員，一鍵快速進入</span>
          </button>

          <p className="text-[11px] text-slate-400 mt-5">
            登入後系統會自動在您的手機中記住認證，下次無需再次輸入。
          </p>
        </div>
      </div>
    </div>
  );
};
