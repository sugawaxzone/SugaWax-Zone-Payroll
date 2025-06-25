// script.js
const payPeriodsPerYear = 26;
const CPP_ANNUAL_MAX = 68500;
const CPP_BASIC_EXEMPTION = 3500;
const CPP_RATE = 0.0595;
const EI_ANNUAL_MAX = 63200;
const EI_RATE = 0.0166;
const TD1_FEDERAL = 16129;
const TD1_ONTARIO = 12747;

function federalTaxAnnual(income) {
  if (income <= 55867) return income * 0.15;
  else if (income <= 111733) return 55867 * 0.15 + (income - 55867) * 0.205;
  else return 55867 * 0.15 + (111733 - 55867) * 0.205 + (income - 111733) * 0.26;
}

function ontarioTaxAnnual(income) {
  if (income <= 51446) return income * 0.0505;
  else if (income <= 102894) return 51446 * 0.0505 + (income - 51446) * 0.0915;
  else return 51446 * 0.0505 + (102894 - 51446) * 0.0915 + (income - 102894) * 0.1116;
}

function loadEmployees() {
  return JSON.parse(localStorage.getItem("employees") || "[]");
}

function saveEmployees(employees) {
  localStorage.setItem("employees", JSON.stringify(employees));
}

function populateEmployeeDropdown() {
  const employees = loadEmployees();
  const select = document.getElementById("employeeSelect");
  select.innerHTML = '<option value="">Select Employee</option>';
  employees.forEach((emp, idx) => {
    const option = document.createElement("option");
    option.value = idx;
    option.textContent = emp.name;
    select.appendChild(option);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateEmployeeDropdown();

  document.getElementById("add-employee-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("newEmployeeName").value;
    const wage = parseFloat(document.getElementById("newEmployeeWage").value);
    if (isNaN(wage) || wage <= 0) {
      alert("Please enter a valid hourly wage.");
      return;
    }
    const employees = loadEmployees();
    employees.push({ name, wage, ytdGross: 0, ytdCpp: 0, ytdEi: 0 });
    saveEmployees(employees);
    populateEmployeeDropdown();
    e.target.reset();
  });

  document.getElementById("payroll-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const employees = loadEmployees();
    const idx = parseInt(document.getElementById("employeeSelect").value);
    const emp = employees[idx];

    const hours = parseFloat(document.getElementById("hours").value);
    const tips = parseFloat(document.getElementById("tips").value) || 0;
    const commission = parseFloat(document.getElementById("commission").value) || 0;
    const period = document.getElementById("period").value;

    const basePay = hours * emp.wage;
    const grossPay = basePay + tips + commission;
    const annualGross = emp.ytdGross + grossPay;

    const round2 = (n) => Math.round(n * 100) / 100;

    // CPP calculation
    let cppExemptPerPeriod = CPP_BASIC_EXEMPTION / payPeriodsPerYear;
    let cppPensionable = Math.max(0, basePay - cppExemptPerPeriod);
    let cpp = Math.min(cppPensionable, CPP_ANNUAL_MAX - emp.ytdGross) * CPP_RATE;
    const maxCpp = (CPP_ANNUAL_MAX - CPP_BASIC_EXEMPTION) * CPP_RATE;
    if (emp.ytdCpp + cpp > maxCpp) cpp = maxCpp - emp.ytdCpp;
    cpp = round2(Math.max(0, cpp));

    // EI calculation
    let eiInsurable = Math.min(basePay, EI_ANNUAL_MAX - emp.ytdGross);
    let ei = eiInsurable * EI_RATE;
    const maxEi = EI_ANNUAL_MAX * EI_RATE;
    if (emp.ytdEi + ei > maxEi) ei = maxEi - emp.ytdEi;
    ei = round2(Math.max(0, ei));

    let taxableIncome = basePay - cpp - ei;
    let annualizedTaxable = taxableIncome * payPeriodsPerYear;

    // Federal Tax
    let fedTaxAnnual = federalTaxAnnual(annualizedTaxable);
    const fedCredit = Math.min(annualizedTaxable, TD1_FEDERAL) * 0.15;
    fedTaxAnnual -= fedCredit;
    fedTaxAnnual = Math.max(0, fedTaxAnnual);
    const fedTax = round2(fedTaxAnnual / payPeriodsPerYear);

    // Ontario Tax
    let ontTaxAnnual = ontarioTaxAnnual(annualizedTaxable);
    const ontCredit = Math.min(annualizedTaxable, TD1_ONTARIO) * 0.0505;
    ontTaxAnnual -= ontCredit;
    ontTaxAnnual = Math.max(0, ontTaxAnnual);
    const ontTax = round2(ontTaxAnnual / payPeriodsPerYear);

    const totalDeductions = round2(fedTax + ontTax + cpp + ei);
    const netPay = round2(grossPay - totalDeductions);

    // Update employee YTDs
    emp.ytdGross += grossPay;
    emp.ytdCpp += cpp;
    emp.ytdEi += ei;
    saveEmployees(employees);

    // Render Pay Stub
    document.getElementById("result").classList.remove("hidden");
    document.getElementById("paystub").innerHTML = `
      <p><strong>Company:</strong> SugaWax Zone</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Name:</strong> ${emp.name}</p>
      <p><strong>Pay Period:</strong> ${period}</p>
      <p><strong>Hours Worked:</strong> ${hours}</p>
      <p><strong>Hourly Rate:</strong> $${emp.wage.toFixed(2)}</p>
      <p><strong>Base Pay:</strong> $${basePay.toFixed(2)}</p>
      <p><strong>Tips:</strong> $${tips.toFixed(2)}</p>
      <p><strong>Commission:</strong> $${commission.toFixed(2)}</p>
      <hr>
      <p><strong>Gross Pay:</strong> $${grossPay.toFixed(2)}</p>
      <p><strong>CPP:</strong> -$${cpp.toFixed(2)}</p>
      <p><strong>EI:</strong> -$${ei.toFixed(2)}</p>
      <p><strong>Federal Tax:</strong> -$${fedTax.toFixed(2)}</p>
      <p><strong>Ontario Tax:</strong> -$${ontTax.toFixed(2)}</p>
      <hr>
      <p class="text-xl font-bold"><strong>Net Pay:</strong> $${netPay.toFixed(2)}</p>
    `;
    e.target.reset();
  });
});
