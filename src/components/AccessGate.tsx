import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert, KeyRound } from 'lucide-react';
import { SECRET_ACCESS_KEY } from '../config';

interface AccessGateProps {
  onUnlock: () => void;
}

export const AccessGate: React.FC<AccessGateProps> = ({ onUnlock }) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      passcode.trim().toLowerCase() === SECRET_ACCESS_KEY.toLowerCase() ||
      passcode.trim().toLowerCase() === 'hkcn' ||
      passcode.trim().toLowerCase() === 'citynorth'
    ) {
      onUnlock();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-[#00A651] flex items-center justify-center mx-auto border border-emerald-500/30">
          <Lock className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold text-[#00A651] tracking-wider uppercase">
            香港城北扶青社
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white">
            活動出席系統 (非公開)
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            此頁面已設置私隱保護。請透過 <strong>WhatsApp 群組內的專屬連結</strong> 進入，或於下方輸入群組通行碼。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type="password"
              placeholder="輸入群組通行碼 (或直接點 WhatsApp 專屬連結)"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                setError(false);
              }}
              className={`w-full px-4 py-3 bg-slate-900/80 border ${
                error ? 'border-red-500 ring-2 ring-red-500/30' : 'border-slate-700'
              } rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00A651] transition-all`}
            />
          </div>

          {error && (
            <p className="text-[11px] text-red-400 flex items-center justify-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>通行碼不正確，請查閱 WhatsApp 群組</span>
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-[#00A651] hover:bg-[#008f45] text-white font-bold text-xs rounded-xl transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>進入系統</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="p-3.5 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
          <p className="font-semibold text-slate-300">💡 社員專屬連結提示：</p>
          <p>
            幹事發送至 WhatsApp 群組的專屬連結已內嵌授權通行碼，直接點擊連結即可自動登入，無須手動輸入密碼。
          </p>
        </div>
      </div>
    </div>
  );
};
