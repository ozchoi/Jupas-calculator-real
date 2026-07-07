const SPREADSHEET_ID = "1vxzcc2zmXm5pLzVjpN5uvDN3hRdJBZDjWK8I2kR0eq8";
const SHEET_NAME = "Feedback";

function doPost(e) {
  const sheet = getFeedbackSheet();
  const payload = parsePayload(e);
  const submittedAt = new Date();
  const date = payload.date || Utilities.formatDate(submittedAt, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const problem = payload.problem || "";

  if (!problem.trim()) {
    return jsonResponse({ ok: false, error: "Problem is required." });
  }

  sheet.appendRow([date, problem, submittedAt]);
  return jsonResponse({ ok: true });
}

function getFeedbackSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Date", "Problem", "Submitted at"]);
  }

  return sheet;
}

function parsePayload(e) {
  if (!e || !e.postData || !e.postData.contents) return {};

  try {
    return JSON.parse(e.postData.contents);
  } catch {
    return {};
  }
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
