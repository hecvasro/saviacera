/**
 * Saviacera — Order receiver
 * --------------------------
 * Deploy this Apps Script bound to a Google Sheet. The site posts an order
 * payload to the Web App URL, and we append a row to the "Orders" tab.
 *
 * Setup checklist (full version in /README.md):
 *   1. Create a new Google Sheet ("Saviacera — Orders" works).
 *   2. Add a tab named "Orders" with the 8-column header row used in
 *      `ensureHeader()`: Timestamp, OrderID, Items, Total, Status,
 *      CustomerPhone, CustomerName, Notes.
 *   3. Extensions → Apps Script. Paste this file in `Code.gs`.
 *   4. Deploy → New deployment → Web app.
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   5. Copy the generated /exec URL into your `.env`:
 *        PUBLIC_ORDER_ENDPOINT="https://script.google.com/macros/s/.../exec"
 *
 * The site sends with `mode: "no-cors"` and `Content-Type: text/plain` to
 * bypass the CORS preflight on Apps Script. The body is still JSON, parsed
 * via `e.postData.contents` below.
 */

const SHEET_NAME = "Orders";
const HEADER = [
  "Timestamp",
  "OrderID",
  "Items",
  "Total",
  "Status",
  "CustomerPhone",
  "CustomerName",
  "Notes",
];

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    const sheet = getOrCreateSheet_();
    ensureHeader_(sheet);

    const itemsText = (payload.items || [])
      .map(function (it) {
        var label = it.variant ? it.name + " (" + it.variant + ")" : it.name;
        return it.qty + " × " + label + " (RD$" + it.unitPrice + ")";
      })
      .join("\n");

    sheet.appendRow([
      new Date(),
      payload.orderId || "",
      itemsText,
      payload.total || 0,
      "pending",
      "", // CustomerPhone — filled in manually after WhatsApp follow-up
      "", // CustomerName
      "", // Notes
    ]);

    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, orderId: payload.orderId }),
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: false, error: String(err) }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

/** Health check — open the /exec URL in a browser to verify the deploy. */
function doGet() {
  return ContentService.createTextOutput(
    JSON.stringify({ ok: true, service: "saviacera-orders" }),
  ).setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  return sheet;
}

function ensureHeader_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADER);
    sheet.setFrozenRows(1);
  }
}
