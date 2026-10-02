// 香港城北扶青社 - 極簡配置

// 1. WhatsApp 專屬訪問通行碼
export const SECRET_ACCESS_KEY = 'hkcn2026cherry';

// 2. 指定 Google Sheet ID
export const HARDCODED_GOOGLE_SHEET_ID = '1u75_qNf62abyiimp4jut26QVM2a2g7G-8bCUwGO-c9I';

// Google Sheet 網址
export const GOOGLE_SHEET_URL = `https://docs.google.com/spreadsheets/d/${HARDCODED_GOOGLE_SHEET_ID}/edit`;

// 可選 Apps Script Web App 網址
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
