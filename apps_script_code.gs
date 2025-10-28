// Google Apps Script (Servidor) - v2
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = data.spreadsheetName || 'Scans';
    var sheet = ss.getSheetByName(sheetName);
    if(!sheet){
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(['Vuelo', 'IATA', 'Fecha', 'Maletero', 'FechaRegistro', 'Barcode 1', 'Barcode 2', '...']);
    }
    var row = data.row || [];
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({status:'ok'})).setMimeType(ContentService.MimeType.JSON);
  } catch(err){
    return ContentService.createTextOutput(JSON.stringify({status:'error', message: String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e){
  return ContentService.createTextOutput('Flybondi Scanner Apps Script endpoint v2').setMimeType(ContentService.MimeType.TEXT);
}
