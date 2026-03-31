// --- KONFIGURASI ID ---
const SPREADSHEET_ID = "1ptFVYYq712uB_tDl0ZY4JDji0zBRKaUuCc6Koiptbm8"; // ID dari Link Database Anda
const FOLDER_DRIVE_ID = "1qfrMj6eEKBZxgX9Eql_Wb4NPQcprsuLn"; // Ganti dengan ID Folder Google Drive Anda

// Fungsi helper untuk koneksi ke Database yang benar
function getDB() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// Fungsi untuk merender HTML
function doGet(e) {
  if (e.parameter.page == 'admin') {
    return HtmlService.createTemplateFromFile('admin').evaluate()
      .setTitle('Admin Panel - SMPN 13 Makassar')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }
  return HtmlService.createTemplateFromFile('index').evaluate()
      .setTitle('Portal Guru - SMPN 13 Makassar')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const request = JSON.parse(e.postData.contents);
    const action = request.action;
    let result;

    if (action === "login") result = checkLogin(request.email, request.password);
    else if (action === "getGuruData") result = getGuruData(request.email);
    else if (action === "simpanData") result = simpanDataDiri(request.data);
    else if (action === "upload") result = uploadBerkas(request.base64, request.fileName, request.email, request.jenis);
    else if (action === "simpanLink") result = simpanLinkKegiatan(request.data);
    else if (action === "getAllData") result = getAllDataForAdmin();
    else if (action === "hapusData") result = hapusDataGuru(request.email);
    else if (action === "adminLogin") result = checkAdminLogin(request.username, request.password);

    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Login Guru
function checkLogin(email, password) {
  const ss = getDB().getSheetByName("Users"); // Menggunakan getDB()
  const data = ss.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === email.trim() && data[i][1].toString().trim() === password.trim()) {
      return { status: "success", email: data[i][0], role: 'guru' };
    }
  }
  return { status: "fail", message: "Email atau Password salah!" };
}

// Login Admin Hardcode
function checkAdminLogin(user, pass) {
  if (user === "admin" && pass === "admin123") { // Ubah password admin disini jika perlu
    return { status: "success" };
  }
  return { status: "fail" };
}

function getGuruData(email) {
  const ss = getDB();
  
  // Ambil Data Diri
  const sheetData = ss.getSheetByName("Data_Guru");
  const rowsData = sheetData.getDataRange().getValues();
  let profil = null;
  for (let i = 1; i < rowsData.length; i++) {
    if (rowsData[i][0] == email) {
      profil = {
        email: rowsData[i][0], nama: rowsData[i][1], nip: rowsData[i][2],
        pangkat: rowsData[i][3], tmptLahir: rowsData[i][4], 
        tglLahir: Utilities.formatDate(new Date(rowsData[i][5]), "GMT+8", "yyyy-MM-dd"),
        mapel: rowsData[i][6]
      };
      break;
    }
  }

  // Ambil Data Berkas
  const sheetBerkas = ss.getSheetByName("Berkas_Guru");
  const rowsBerkas = sheetBerkas.getDataRange().getValues();
  let berkas = { KK: "", SK: "", KGB: "", Foto: "" };
  for (let i = 1; i < rowsBerkas.length; i++) {
    if (rowsBerkas[i][0] == email) {
      berkas = { KK: rowsBerkas[i][1], SK: rowsBerkas[i][2], KGB: rowsBerkas[i][3], Foto: rowsBerkas[i][4] };
      break;
    }
  }

  // Ambil History Link
  const sheetLink = ss.getSheetByName("Link_Kegiatan");
  const rowsLink = sheetLink.getDataRange().getValues();
  let links = [];
  for (let i = 1; i < rowsLink.length; i++) {
    if (rowsLink[i][0] == email) {
      links.push({ judul: rowsLink[i][1], url: rowsLink[i][2], tgl: rowsLink[i][3] });
    }
  }

  return { status: "success", profil: profil, berkas: berkas, links: links };
}

function simpanDataDiri(obj) {
  const ss = getDB().getSheetByName("Data_Guru");
  const data = ss.getDataRange().getValues();
  let found = false;
  let tglFix = obj.tglLahir; 

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == obj.email) {
      ss.getRange(i + 1, 1, 1, 7).setValues([[obj.email, obj.nama, obj.nip, obj.pangkat, obj.tmptLahir, tglFix, obj.mapel]]);
      found = true; break;
    }
  }
  if (!found) ss.appendRow([obj.email, obj.nama, obj.nip, obj.pangkat, obj.tmptLahir, tglFix, obj.mapel]);
  return { status: "success", message: "Data berhasil disimpan!" };
}

function uploadBerkas(base64, name, email, jenis) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_DRIVE_ID);
    const split = base64.split(",");
    const contentType = split[0].match(/:(.*?);/)[1];
    const blob = Utilities.newBlob(Utilities.base64Decode(split[1]), contentType, name);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const ss = getDB().getSheetByName("Berkas_Guru");
    const data = ss.getDataRange().getValues();
    const colMap = { "KK": 2, "SK": 3, "KGB": 4, "Foto": 5 };
    const targetCol = colMap[jenis];
    
    let found = false;
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] == email) {
        ss.getRange(i + 1, targetCol).setValue(file.getUrl());
        found = true; break;
      }
    }
    if (!found) {
      let row = [email, "", "", "", ""];
      row[targetCol - 1] = file.getUrl();
      ss.appendRow(row);
    }
    return { status: "success", message: "Berkas berhasil diunggah!", url: file.getUrl() };
  } catch (e) {
    return { status: "error", message: "Gagal upload. Pastikan ID Folder benar." };
  }
}

function simpanLinkKegiatan(obj) {
  const ss = getDB().getSheetByName("Link_Kegiatan");
  ss.appendRow([obj.email, obj.judul, obj.link, new Date()]);
  return { status: "success", message: "Link berhasil dikirim!" };
}

function getAllDataForAdmin() {
  const ss = getDB();
  return {
    status: "success",
    guru: ss.getSheetByName("Data_Guru").getDataRange().getValues(),
    berkas: ss.getSheetByName("Berkas_Guru").getDataRange().getValues(),
    kegiatan: ss.getSheetByName("Link_Kegiatan").getDataRange().getValues()
  };
}

function hapusDataGuru(email) {
  const ss = getDB();
  ["Data_Guru", "Berkas_Guru", "Link_Kegiatan", "Users"].forEach(name => {
    let sheet = ss.getSheetByName(name);
    if(sheet) {
      let data = sheet.getDataRange().getValues();
      for (let i = data.length - 1; i >= 1; i--) {
        if (data[i][0] == email) sheet.deleteRow(i + 1);
      }
    }
  });
  return { status: "success", message: "Data dihapus." };
}
