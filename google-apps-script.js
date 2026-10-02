/**
 * 香港城北扶青社 - Google Sheet 專屬後端 API (Google Apps Script)
 * 已部署網址：https://script.google.com/macros/s/AKfycbw65_gDvA3QXOnO4oel3pSUcdLfja_u8-PMJIYKLdvX5XEbaoITrO2Op-BKy6BGCt1K/exec
 * 
 * 支援功能：
 * 1. 分頁 1「Events」：活動與出席名單雙向同步
 * 2. 分頁 2「SystemLogs」：跨裝置集中記錄所有改動紀錄
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var eventsSheet = getOrCreateSheet(ss, 'Events', getEventsHeaders(), '#00A651');
  var logsSheet = getOrCreateSheet(ss, 'SystemLogs', getLogsHeaders(), '#6B21A8');

  // 1. 讀取活動數據
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
        if (parsed.attendance) {
          attendance = parsed.attendance;
          remarks = parsed.remarks || {};
        } else {
          attendance = parsed;
        }
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

  // 2. 讀取操作紀錄數據 (System Logs)
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
  try {
    var rawData = e.postData ? e.postData.contents : null;
    if (!rawData) {
      return jsonResponse({ status: 'error', message: 'No post data' });
    }

    var payload = JSON.parse(rawData);
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    // 1. 同步所有活動 (允許空陣列清空，絕不強加範例)
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

    // 3. 清空日誌紀錄
    if (payload.action === 'clear_logs') {
      var logsSheet = getOrCreateSheet(ss, 'SystemLogs', getLogsHeaders(), '#6B21A8');
      logsSheet.clearContents();
      setupHeaders(logsSheet, getLogsHeaders(), '#6B21A8');
      return jsonResponse({ status: 'success', message: 'Logs cleared' });
    }

    // 4. RSVP 更新
    if (payload.action === 'rsvp') {
      var eventsSheet = getOrCreateSheet(ss, 'Events', getEventsHeaders(), '#00A651');
      var data = eventsSheet.getDataRange().getValues();
      var found = false;

      for (var i = 1; i < data.length; i++) {
        if (data[i][1] === payload.eventTitle || data[i][0] === payload.eventId) {
          var attendance = {};
          var remarks = {};
          try {
            var parsed = JSON.parse(data[i][3] || '{}');
            if (parsed.attendance) {
              attendance = parsed.attendance;
              remarks = parsed.remarks || {};
            } else {
              attendance = parsed;
            }
          } catch (err) {}

          attendance[payload.memberName] = payload.choice;
          if (payload.remark) {
            remarks[payload.memberName] = payload.remark;
          } else {
            delete remarks[payload.memberName];
          }

          eventsSheet.getRange(i + 1, 4).setValue(JSON.stringify({ attendance: attendance, remarks: remarks }));
          eventsSheet.getRange(i + 1, 6).setValue(getSummaryText(attendance, remarks, 'attending'));
          eventsSheet.getRange(i + 1, 7).setValue(getSummaryText(attendance, remarks, 'declined'));
          eventsSheet.getRange(i + 1, 8).setValue(getSummaryText(attendance, remarks, 'tbc'));
          eventsSheet.getRange(i + 1, 9).setValue(getSummaryText(attendance, remarks, 'late_early'));
          found = true;
          break;
        }
      }

      if (!found && Array.isArray(payload.events)) {
        writeAllEvents(eventsSheet, payload.events);
      }

      // 同時寫入 log
      if (payload.log) {
        var logsSheet = getOrCreateSheet(ss, 'SystemLogs', getLogsHeaders(), '#6B21A8');
        appendLog(logsSheet, payload.log);
      }

      return jsonResponse({ status: 'success', message: 'RSVP updated' });
    }

    return jsonResponse({ status: 'success' });
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

function writeAllEvents(sheet, events) {
  sheet.clearContents();
  setupHeaders(sheet, getEventsHeaders(), '#00A651');

  if (!events || events.length === 0) return;

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
      getSummaryText(attendance, remarks, 'declined'),
      getSummaryText(attendance, remarks, 'tbc'),
      getSummaryText(attendance, remarks, 'late_early')
    ]);
  }

  sheet.getRange(2, 1, rows.length, 9).setValues(rows);
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
    '去唔到名單 (Declined)',
    'TBC名單 (TBC)',
    '遲到早退名單 (Late/Early)'
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
