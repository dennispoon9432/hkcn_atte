/**
 * 香港城北扶青社 - Google Sheet 專屬後端 API (Google Apps Script)
 * 已部署網址：https://script.google.com/macros/s/AKfycbw65_gDvA3QXOnO4oel3pSUcdLfja_u8-PMJIYKLdvX5XEbaoITrO2Op-BKy6BGCt1K/exec
 */

function doGet(e) {
  var sheet = getOrCreateSheet();

  // 支援透過 GET 參數進行備份寫入
  if (e && e.parameter && e.parameter.action === 'sync_all' && e.parameter.data) {
    try {
      var events = JSON.parse(e.parameter.data);
      writeAllEvents(sheet, events);
      return jsonResponse({ status: 'success', message: 'Synced via GET' });
    } catch (err) {
      return jsonResponse({ status: 'error', message: err.toString() });
    }
  }

  // 讀取所有活動與出席數據
  var data = sheet.getDataRange().getValues();
  var events = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1]) continue;

    var id = String(row[0] || 'evt-' + i);
    var title = String(row[1] || '');
    var dateTime = String(row[2] || '');
    var attendance = {};
    var remarks = {};

    try {
      if (row[3]) {
        var parsed = JSON.parse(String(row[3]));
        if (parsed.attendance) {
          attendance = parsed.attendance;
          remarks = parsed.remarks || {};
        } else {
          attendance = parsed;
        }
      }
    } catch (err) {
      attendance = {};
      remarks = {};
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

  return jsonResponse({
    status: 'success',
    events: events,
    count: events.length,
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
    var sheet = getOrCreateSheet();

    if (payload.action === 'sync_all' && Array.isArray(payload.events)) {
      writeAllEvents(sheet, payload.events);
      return jsonResponse({ status: 'success', message: 'All events synced' });
    }

    if (payload.action === 'rsvp') {
      var eventTitle = payload.eventTitle;
      var memberName = payload.memberName;
      var choice = payload.choice;
      var remark = payload.remark;

      var data = sheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < data.length; i++) {
        if (data[i][1] === eventTitle || data[i][0] === payload.eventId) {
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

          attendance[memberName] = choice;
          if (remark) {
            remarks[memberName] = remark;
          } else {
            delete remarks[memberName];
          }

          sheet.getRange(i + 1, 4).setValue(JSON.stringify({ attendance: attendance, remarks: remarks }));
          sheet.getRange(i + 1, 6).setValue(getSummaryText(attendance, remarks, 'attending'));
          sheet.getRange(i + 1, 7).setValue(getSummaryText(attendance, remarks, 'late_early'));
          sheet.getRange(i + 1, 8).setValue(getSummaryText(attendance, remarks, 'declined'));
          sheet.getRange(i + 1, 9).setValue(getSummaryText(attendance, remarks, 'tbc'));
          found = true;
          break;
        }
      }

      if (!found && Array.isArray(payload.events)) {
        writeAllEvents(sheet, payload.events);
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
  setupHeaders(sheet);

  if (!events || events.length === 0) return;

  var rows = [];
  for (var i = 0; i < events.length; i++) {
    var evt = events[i];
    var attendance = evt.attendance || {};
    var remarks = evt.remarks || {};
    var payloadObj = {
      attendance: attendance,
      remarks: remarks
    };

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

  sheet.getRange(2, 1, rows.length, 9).setValues(rows);
}

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Events');
  if (!sheet) {
    sheet = ss.getActiveSheet();
    sheet.setName('Events');
  }
  if (sheet.getLastRow() === 0) {
    setupHeaders(sheet);
  }
  return sheet;
}

function setupHeaders(sheet) {
  var headers = [
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
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setBackground('#00A651').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
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
