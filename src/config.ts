// 香港城北扶青社 - 極簡配置
// 所有數據已預設指定 Google Sheet，無需手動設定

// 1. WhatsApp 專屬訪問通行碼 (連結格式: ?key=hkcn2026)
export const SECRET_ACCESS_KEY = 'hkcn2026';

// 2. 指定已 Hardcode 的 Google Sheet ID
// 請將此處字串換成你的公開 Google Sheet ID (例如: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)
export const HARDCODED_GOOGLE_SHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

// 可選：如果你有設置 Google Apps Script Web App，貼在此處可自動雙向寫入 Sheet
export const HARDCODED_APPS_SCRIPT_URL = '';

// 3. 固定的 13 位核心社員名單
export const CORE_MEMBERS = [
  'Cherry',
  'Paris',
  'Onki',
  'Henry',
  'Alvin',
  'Rio',
  'Rainbow',
  'Kellie',
  'Winston',
  'Jack',
  'Mimi',
  'Timmy',
  'Jill',
] as const;

export type MemberName = (typeof CORE_MEMBERS)[number];
