// Google Apps Script (Servidor) - pega esto en un nuevo proyecto de Apps Script
// Crea o usa una hoja llamada 'Scans' (o la que indiques en config) y despliega el proyecto como Web App
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    // If you prefer to open by ID, replace with SpreadsheetApp.openById('SPREADSHEET_ID');
    var sheetName = data.spreadsheetName || 'Scans';
    var sheet = ss.getSheetByName(sheetName);
    if(!sheet){
      sheet = ss.insertSheet(sheetName);
      // Optional header
      sheet.appendRow(['Vuelo', 'IATA', 'Fecha', 'Maletero', 'FechaRegistro', 'Barcode 1', 'Barcode 2', '...']);
    }
    var row = data.row || [];
    sheet.appendRow(row);
    return ContentService.createTextOutput(JSON.stringify({status:'ok'})).setMimeType(ContentService.MimeType.JSON);
  } catch(err){
    return ContentService.createTextOutput(JSON.stringify({status:'error', message: String(err)})).setMimeType(ContentService.MimeType.JSON);
  }
}

// Simple GET to test
function doGet(e){
  return ContentService.createTextOutput('Flybondi Scanner Apps Script endpoint').setMimeType(ContentService.MimeType.TEXT);
}
