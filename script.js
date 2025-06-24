// CRA 2025 Ontario constants
const payPeriodsPerYear = 26;
const CPP_ANNUAL_MAX = 68500;
const CPP_BASIC_EXEMPTION = 3500;
const CPP_RATE = 0.0595;
const EI_ANNUAL_MAX = 63200;
const EI_RATE = 0.0166;
const TD1_FEDERAL = 16129;
const TD1_ONTARIO = 12747;

// Federal tax brackets (simplified)
function federalTaxAnnual(income) {
  if (income <= 55867) return income * 0.15;
  else if (income <= 111733) return 55867 * 0.15 + (income - 55867) * 0.205;
  else return 55867 * 0.15 + (111733 - 55867) * 0.205 + (income - 111733) * 0.26;
}

// Ontario tax brackets (simplified)
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
    option.textContent = `${emp.name} ($${emp.wage.toFixed(2)})`;
    select.appendChild(option);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateEmployeeDropdown();

  document.getElementById("add-employee-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("newEmployeeName").value.trim();
    const wage = parseFloat(document.getElementById("newEmployeeWage").value);

    if (!name) {
      alert("Please enter a name.");
      return;
    }
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

    if (isNaN(idx)) {
      alert("Please select an employee.");
      return;
    }

    const emp = employees[idx];
    const hours = parseFloat(document.getElementById("hours").value);
    const tips = parseFloat(document.getElementById("tips").value) || 0;
    const commission = parseFloat(document.getElementById("commission").value) || 0;
    const period = document.getElementById("period").value;
    const payDate = document.getElementById("payDate").value;

    if (!payDate) {
      alert("Please enter a valid pay date.");
      return;
    }
    if (isNaN(hours) || hours < 0) {
      alert("Please enter valid hours worked.");
      return;
    }
    if (!period.trim()) {
      alert("Please enter the pay period.");
      return;
    }

    const basePay = hours * emp.wage;
    const grossPay = basePay + tips + commission;

    // CPP calculation
    const cppExemptPerPeriod = CPP_BASIC_EXEMPTION / payPeriodsPerYear;
    let pensionableEarningsThisPeriod = Math.max(0, basePay - cppExemptPerPeriod);

    const maxCppContribution = (CPP_ANNUAL_MAX - CPP_BASIC_EXEMPTION) * CPP_RATE;
    let cpp = pensionableEarningsThisPeriod * CPP_RATE;
    if (emp.ytdCpp + cpp > maxCppContribution) {
      cpp = Math.max(0, maxCppContribution - emp.ytdCpp);
    }

    // EI calculation
    const eiInsurableEarningsLeft = Math.max(0, EI_ANNUAL_MAX - emp.ytdGross);
    const eiInsurable = Math.min(basePay, eiInsurableEarningsLeft);
    let ei = eiInsurable * EI_RATE;
    const maxEiContribution = EI_ANNUAL_MAX * EI_RATE;
    if (emp.ytdEi + ei > maxEiContribution) {
      ei = Math.max(0, maxEiContribution - emp.ytdEi);
    }

    // Taxable income for income tax = base pay - CPP - EI
    const taxableIncome = basePay - cpp - ei;
    const annualizedTaxableIncome = taxableIncome * payPeriodsPerYear;

    // Federal & provincial tax minus basic credits
    let fedTaxAnnual = federalTaxAnnual(annualizedTaxableIncome) - (TD1_FEDERAL * 0.15);
    let ontTaxAnnual = ontarioTaxAnnual(annualizedTaxableIncome) - (TD1_ONTARIO * 0.0505);

    fedTaxAnnual = Math.max(0, fedTaxAnnual);
    ontTaxAnnual = Math.max(0, ontTaxAnnual);

    const fedTax = fedTaxAnnual / payPeriodsPerYear;
    const ontTax = ontTaxAnnual / payPeriodsPerYear;

    // Total deductions & net pay
    const totalDeductions = fedTax + ontTax + cpp + ei;
    const netPay = grossPay - totalDeductions;

    // Update YTD values and save
    emp.ytdGross += grossPay;
    emp.ytdCpp += cpp;
    emp.ytdEi += ei;
    saveEmployees(employees);

    // Render pay stub
    document.getElementById("result").classList.remove("hidden");
    document.getElementById("paystub").innerHTML = `
      <p><strong>Company:</strong> SugaWax Zone</p>
      <p><strong>Pay Date:</strong> ${new Date(payDate).toLocaleDateString()}</p>
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
