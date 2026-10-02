import React, { useState } from 'react';
import { X, Users, UserPlus, Check, UserCheck, Shield } from 'lucide-react';
import { Member } from '../types';

interface MemberRosterModalProps {
  members: Member[];
  currentUserId: string | null;
  onSelectCurrentUser: (id: string) => void;
  onAddMember: (name: string, role?: string) => void;
  onClose: () => void;
}

export const MemberRosterModal: React.FC<MemberRosterModalProps> = ({
  members,
  currentUserId,
  onSelectCurrentUser,
  onAddMember,
  onClose,
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('社員');
  const [search, setSearch] = useState('');

  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddMember(newName.trim(), newRole.trim());
    setNewName('');
    setShowAdd(false);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#00A651] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                香港城北扶青社 · 社員名冊
              </h2>
              <p className="text-[11px] text-slate-500">
                共 {members.length} 位核心社員，點擊可直接切換為本人身份一鍵登記出席
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              placeholder="搜尋社員姓名..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#00A651]"
            />
            <button
              onClick={() => setShowAdd(!showAdd)}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#00A651] font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 shrink-0"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>＋ 新增社員</span>
            </button>
          </div>

          {showAdd && (
            <form
              onSubmit={handleAddSubmit}
              className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2 text-xs"
            >
              <div className="font-semibold text-emerald-900">加入新社員</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="社員姓名 (例如: Dennis)"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                  required
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs"
                >
                  <option value="社員">社員</option>
                  <option value="幹事">幹事</option>
                  <option value="社長">社長</option>
                  <option value="副社長">副社長</option>
                  <option value="秘書">秘書</option>
                  <option value="財務">財務</option>
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#00A651] hover:bg-[#008f45] text-white font-medium rounded-lg text-xs"
                >
                  儲存並加入所有活動
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs"
                >
                  取消
                </button>
              </div>
            </form>
          )}

          {/* Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {filteredMembers.map((member) => {
              const isSelected = currentUserId === member.id;
              return (
                <div
                  key={member.id}
                  onClick={() => onSelectCurrentUser(member.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-emerald-50/80 border-emerald-400 shadow-xs ring-1 ring-[#00A651]'
                      : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        isSelected
                          ? 'bg-[#00A651] text-white'
                          : 'bg-white border border-slate-200 text-slate-700'
                      }`}
                    >
                      {member.name.slice(0, 1)}
                    </div>
                    <div className="truncate">
                      <div className="text-xs font-bold text-slate-900 truncate flex items-center gap-1">
                        <span>{member.name}</span>
                        {isSelected && (
                          <span className="text-[10px] text-emerald-700 font-normal">
                            (本人)
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {member.role || '社員'}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSelected ? (
                      <span className="px-2 py-0.5 bg-[#00A651] text-white text-[10px] font-semibold rounded-md flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        <span>已選</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 hover:text-slate-700">
                        選擇
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/70 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
