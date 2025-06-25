function doGet() {
  return HtmlService.createHtmlOutputFromFile("index").setTitle("Payroll Web App");
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function submitPayroll(formData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(formData.employee);
  const admin = ss.getSheetByName("Admin");

  const gross = formData.hoursWorked * formData.hourlyRate;
  const deductions = Number(formData.deductions) || 0;
  const net = gross - deductions;
  const date = new Date();

  sheet.appendRow([
    date, formData.payPeriod, formData.hoursWorked, formData.hourlyRate,
    gross, deductions, net, formData.notes
  ]);

  admin.appendRow([
    formData.employee, date, gross, deductions, net
  ]);

  const pdf = generatePaystub(formData, gross, deductions, net);
  MailApp.sendEmail({
    to: getEmployeeEmail(formData.employee),
    subject: `Paystub - ${formData.payPeriod}`,
    body: `Hi ${formData.employee},\n\nPlease find attached your paystub for ${formData.payPeriod}.`,
    attachments: [pdf]
  });

  return "Success";
}

function getEmployeeEmail(name) {
  const map = {
    "Amya Mazza": "amya@example.com",
    "Jaya Kaur": "jaya@example.com"
  };
  return map[name] || Session.getActiveUser().getEmail();
}

function generatePaystub(data, gross, deductions, net) {
  const html = HtmlService.createTemplateFromFile("paystub");
  html.employee = data.employee;
  html.payPeriod = data.payPeriod;
  html.gross = gross.toFixed(2);
  html.deductions = deductions.toFixed(2);
  html.net = net.toFixed(2);
  html.notes = data.notes;

  const pdfHtml = html.evaluate().getContent();
  const blob = Utilities.newBlob(pdfHtml, "text/html", "paystub.html");
  return blob.getAs("application/pdf").setName(`${data.employee}_Paystub.pdf`);
}
