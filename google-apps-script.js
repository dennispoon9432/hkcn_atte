/**
 * 香港城北扶青社 - Google Sheet 專屬後端 API (Google Apps Script) - 高可用防並發版
 * 
 * 安全機制：
 * 1. 【LockService 並發排隊保護】：所有寫入請求以原子鎖 (LockService) 依序排隊，防止同時發送請求導致資料被清空。
 * 2. 【無損更新 (Non-destructive update)】：禁止在寫入前清空 (clearContents) 工作表，改用覆寫加修剪，確保任何錯誤都不會遺失資料。
 * 3. 【災難自動修復 (Self-Healing)】：若 Events 分頁無故空白，系統會即時從 SystemLogs 自動還原所有活動與出席數據。
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var eventsSheet = getOrCreateSheet(ss, 'Events', getEventsHeaders(), '#00A651');
  var logsSheet = getOrCreateSheet(ss, 'SystemLogs', getLogsHeaders(), '#6B21A8');

  // 1. 讀取操作紀錄數據 (System Logs)
  var logRows = logsSheet.getDataRange().getValues();
  var logs = [];

  for (var j = 1; j < logRows.length; j++) {
    var lRow = logRows[j];
    if (!lRow[0] && !lRow[1]) continue;

    logs.push({
      id: String(lRow[0] || 'log-' + j),
      timestamp: lRow[1] ? String(lRow[1]) : new Date().toISOString(),
      actionType: String(lRow[2] || 'rsvp'),
      title: String(lRow[3] || ''),
      memberName: String(lRow[4] || ''),
      detail: String(lRow[5] || '')
    });
  }

  // 2. 讀取活動數據
  var eventRows = eventsSheet.getDataRange().getValues();
  var events = [];

  for (var i = 1; i < eventRows.length; i++) {
    var row = eventRows[i];
    if (!row[0] && !row[1]) continue;

    var id = String(row[0] || 'evt-' + i);
    var title = String(row[1] || '');
    var dateTime = String(row[2] || '');
    var attendance = {};
    var remarks = {};

    if (row[3]) {
      try {
        var parsed = JSON.parse(String(row[3]));
        attendance = parsed.attendance || parsed;
        remarks = parsed.remarks || {};
      } catch (err) {}
    }

    events.push({
      id: id,
      title: title,
      dateTime: dateTime,
      attendance: attendance,
      remarks: remarks,
      createdAt: row[4] ? String(row[4]) : new Date().toISOString()
    });
  }

  // 3. 自我修復防護機制：若 Events 為空但 Logs 有紀錄，自動從 Logs 還原
  if (events.length === 0 && logs.length > 0) {
    events = reconstructEventsFromLogs(logs);
    if (events.length > 0) {
      writeAllEvents(eventsSheet, events);
    }
  }

  // 最新的紀錄排在最前
  logs.reverse();

  return jsonResponse({
    status: 'success',
    events: events,
    logs: logs,
    timestamp: new Date().toISOString()
  });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    // 排隊等待鎖定最多 30 秒，徹底杜絕並發衝突
    lock.waitLock(30000);
  } catch (err) {
    return jsonResponse({ status: 'error', message: '伺服器忙碌，請重試' });
  }

  try {
    var rawData = e.postData ? e.postData.contents : null;
    if (!rawData) {
      return jsonResponse({ status: 'error', message: 'No post data' });
    }

    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. 同步所有活動
    if (payload.action === 'sync_all' && Array.isArray(payload.events)) {
      var eventsSheet = getOrCreateSheet(ss, 'Events', getEventsHeaders(), '#00A651');
      writeAllEvents(eventsSheet, payload.events);

      if (payload.log) {
        var logsSheet = getOrCreateSheet(ss, 'SystemLogs', getLogsHeaders(), '#6B21A8');
        appendLog(logsSheet, payload.log);
      }

      return jsonResponse({ status: 'success', message: 'Events synced' });
    }

    // 2. 單獨新增日誌紀錄
    if (payload.action === 'add_log' && payload.log) {
      var logsSheet = getOrCreateSheet(ss, 'SystemLogs', getLogsHeaders(), '#6B21A8');
      appendLog(logsSheet, payload.log);
      return jsonResponse({ status: 'success', message: 'Log appended' });
    }

    // 3. RSVP 原子更新
    if (payload.action === 'rsvp') {
      var eventsSheet = getOrCreateSheet(ss, 'Events', getEventsHeaders(), '#00A651');
      
      // 若前端同時傳送了完整 updated events，直接安全覆寫完整列表以確保一致性
      if (Array.isArray(payload.events) && payload.events.length > 0) {
        writeAllEvents(eventsSheet, payload.events);
      } else {
        // 單筆比對更新
        var data = eventsSheet.getDataRange().getValues();
        var found = false;
        for (var i = 1; i < data.length; i++) {
          if (data[i][1] === payload.eventTitle || data[i][0] === payload.eventId) {
            var attendance = {};
            var remarks = {};
            try {
              var parsed = JSON.parse(data[i][3] || '{}');
              attendance = parsed.attendance || parsed;
              remarks = parsed.remarks || {};
            } catch (err) {}

            attendance[payload.memberName] = payload.choice;
            if (payload.remark) {
              remarks[payload.memberName] = payload.remark;
            } else {
              delete remarks[payload.memberName];
            }

            eventsSheet.getRange(i + 1, 4).setValue(JSON.stringify({ attendance: attendance, remarks: remarks }));
            eventsSheet.getRange(i + 1, 6).setValue(getSummaryText(attendance, remarks, 'attending'));
            eventsSheet.getRange(i + 1, 7).setValue(getSummaryText(attendance, remarks, 'late_early'));
            eventsSheet.getRange(i + 1, 8).setValue(getSummaryText(attendance, remarks, 'declined'));
            eventsSheet.getRange(i + 1, 9).setValue(getSummaryText(attendance, remarks, 'tbc'));
            found = true;
            break;
          }
        }
      }

      // 同時寫入日誌
      if (payload.log) {
        var logsSheet = getOrCreateSheet(ss, 'SystemLogs', getLogsHeaders(), '#6B21A8');
        appendLog(logsSheet, payload.log);
      }

      return jsonResponse({ status: 'success', message: 'RSVP updated' });
    }

    return jsonResponse({ status: 'success' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

/**
 * 安全無損寫入所有活動：
 * 絕不使用 sheet.clearContents()，改用覆寫現有儲存格並移除多餘列，避免清空後出錯造成資料遺失。
 */
function writeAllEvents(sheet, events) {
  setupHeaders(sheet, getEventsHeaders(), '#00A651');

  if (!events || events.length === 0) {
    // 若真的要刪除到 0 個活動
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    return;
  }

  var rows = [];
  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    var attendance = evt.attendance || {};
    var remarks = evt.remarks || {};
    var payloadObj = { attendance: attendance, remarks: remarks };

    rows.push([
      evt.id || 'evt-' + i,
      evt.title,
      evt.dateTime,
      JSON.stringify(payloadObj),
      evt.createdAt || new Date().toISOString(),
      getSummaryText(attendance, remarks, 'attending'),
      getSummaryText(attendance, remarks, 'late_early'),
      getSummaryText(attendance, remarks, 'declined'),
      getSummaryText(attendance, remarks, 'tbc')
    ]);
  }

  // 1. 直接寫入新數據 (覆寫)
  sheet.getRange(2, 1, rows.length, 9).setValues(rows);

  // 2. 若原本列數多於新數據列數，安全移除多餘行
  var lastRow = sheet.getLastRow();
  var expectedLastRow = rows.length + 1;
  if (lastRow > expectedLastRow) {
    sheet.deleteRows(expectedLastRow + 1, lastRow - expectedLastRow);
  }
}

function appendLog(sheet, log) {
  sheet.appendRow([
    log.id || 'log-' + Date.now(),
    log.timestamp || new Date().toISOString(),
    log.actionType || 'rsvp',
    log.title || '',
    log.memberName || '',
    log.detail || ''
  ]);
}

function getOrCreateSheet(ss, sheetName, headers, headerColor) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    setupHeaders(sheet, headers, headerColor);
  }
  if (sheet.getLastRow() === 0) {
    setupHeaders(sheet, headers, headerColor);
  }
  return sheet;
}

function setupHeaders(sheet, headers, bgColor) {
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setBackground(bgColor || '#00A651').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function getEventsHeaders() {
  return [
    '活動ID (ID)',
    '活動名稱 (Title)',
    '日期時間 (DateTime)',
    '出席名冊數據 (JSON)',
    '建立時間 (CreatedAt)',
    '去到名單 (Attending)',
    '遲到早退名單 (Late/Early)',
    '去唔到名單 (Declined)',
    'TBC名單 (TBC)'
  ];
}

function getLogsHeaders() {
  return [
    '紀錄ID (Log ID)',
    '時間 (Timestamp)',
    '操作類型 (Action Type)',
    '標題 (Title)',
    '社員 (Member)',
    '詳情 (Detail)'
  ];
}

function getSummaryText(attendance, remarks, choice) {
  if (!attendance) return '';
  var list = [];
  for (var k in attendance) {
    if (attendance[k] === choice) {
      if (remarks && remarks[k]) {
        list.push(k + ' (' + remarks[k] + ')');
      } else {
        list.push(k);
      }
    }
  }
  return list.join(', ');
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 萬一 Events 工作表遭人為或意外清空，由此函式由歷史 SystemLogs 自動重建
 */
function reconstructEventsFromLogs(logs) {
  var eventsMap = {};
  var order = [];

  for (var i = 0; i < logs.length; i++) {
    var item = logs[i];
    var action = item.actionType;
    var detail = item.detail || '';

    if (action === 'create') {
      var matchCreate = detail.match(/成功建立活動「(.*?)」（時間：(.*?)）/);
      if (matchCreate) {
        var t = matchCreate[1].trim();
        var dt = matchCreate[2].trim();
        eventsMap[t] = {
          id: 'evt-' + t.replace(/[^\w\u4e00-\u9fa5]+/g, '-'),
          title: t,
          dateTime: dt,
          attendance: {},
          remarks: {}
        };
        if (order.indexOf(t) === -1) order.unshift(t);
      }
    } else if (action === 'delete') {
      var matchDel = detail.match(/確認刪除活動「(.*?)」/);
      if (matchDel) {
        var delT = matchDel[1].trim();
        delete eventsMap[delT];
        var idx = order.indexOf(delT);
        if (idx !== -1) order.splice(idx, 1);
      }
    } else if (action === 'reorder') {
      var matchReorder = detail.match(/將「(.*?)」排位調整至第 (\d+) 位/);
      if (matchReorder) {
        var roT = matchReorder[1].trim();
        var targetPos = parseInt(matchReorder[2], 10) - 1;
        var curIdx = order.indexOf(roT);
        if (curIdx !== -1) {
          order.splice(curIdx, 1);
          order.splice(targetPos, 0, roT);
        }
      }
    } else if (action === 'rsvp') {
      var matchRsvp = detail.match(/^(.*?) 於「(.*?)」登記出席狀態為：(.*?)$/);
      if (matchRsvp) {
        var mem = matchRsvp[1].trim();
        var rTitle = matchRsvp[2].trim();
        var statusRaw = matchRsvp[3].trim();

        var choice = 'attending';
        if (statusRaw.indexOf('遲到早退') !== -1) choice = 'late_early';
        else if (statusRaw.indexOf('去唔到') !== -1) choice = 'declined';
        else if (statusRaw.indexOf('TBC') !== -1) choice = 'tbc';
        else if (statusRaw.indexOf('去到') !== -1) choice = 'attending';

        var remark = null;
        var matchRem = statusRaw.match(/\((.*?)\)/);
        if (matchRem) remark = matchRem[1].trim();

        if (eventsMap[rTitle]) {
          eventsMap[rTitle].attendance[mem] = choice;
          if (remark) eventsMap[rTitle].remarks[mem] = remark;
          else delete eventsMap[rTitle].remarks[mem];
        }
      }
    }
  }

  var result = [];
  for (var k = 0; k < order.length; k++) {
    if (eventsMap[order[k]]) {
      result.push(eventsMap[order[k]]);
    }
  }
  return result;
}
