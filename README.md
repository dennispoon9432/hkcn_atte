# 香港城北扶青社 - 活動出席登記系統
**Rotaract Club of Hong Kong City North - Attendance & Event System**

專為香港城北扶青社設計的活動出席與報名管理系統，支援免密碼專屬連結一鍵簽到、實時人數統計及 WhatsApp 報名格式一鍵複製。

## 🌟 核心功能
- **免密碼專屬連結 (Secret Link)**：社員於 WhatsApp 點擊內嵌 Token 連結即可直接自動登入，無需記密碼。
- **13位核心社員名冊**：已內置 Cherry、Paris、Onki、Henry、Alvin、Rio、Rainbow、Kellie、Winston、Jack、Mimi、Timmy、Jill。
- **一鍵個人簽到**：選擇本人姓名後，可一鍵登記「出席」、「未能出席」或「待定」，並可填寫備註。
- **WhatsApp 格式一鍵複製**：自動生成過往常用的報名及出席名單格式，方便幹事貼回群組。
- **實時雲端同步與備份**：後端實時同步出席數據，支援下載 JSON 及 Excel (CSV) 數據備份。

## 🚀 本地開發與運行
```bash
npm install
npm run dev
```

開發伺服器運行於 `http://localhost:3000`。
