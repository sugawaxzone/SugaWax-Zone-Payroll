// script.js - Updated for accurate CRA-like payroll calculations

const CRA_DATA = {
  2025: {
    payPeriodsPerYear: 26,
    CPP_ANNUAL_MAX: 68500,
    CPP_BASIC_EXEMPTION: 3500,
    CPP_RATE: 0.0595,
    EI_ANNUAL_MAX: 63200,
    EI_RATE: 0.0166,
    federalTaxBrackets: [
      { limit: 55867, rate: 0.15 },
      { limit: 111733, rate: 0.205 },
      { limit: Infinity, rate: 0.26 },
    ],
    ontarioTaxBrackets: [
      { limit: 51446, rate: 0.0505 },
      { limit: 102894, rate: 0.0915 },
      { limit: Infinity, rate: 0.1116 },
    ],
  },
};

// You can change these personal amounts to match your TD1 form values
const FEDERAL_PERSONAL_AMOUNT = 16129;  // From TD1 federal
const PROVINCIAL_PERSONAL_AMOUNT = 12747; // From TD1 provincial (Ontario)

function calculateTax(income, brackets) {
  let tax = 0;
  let prevLimit = 0;
  for (const bracket of brackets) {
    if (income <= prevLimit) break;
    const taxable = Math.min(income, bracket.limit) - prevLimit;
    tax += taxable * bracket.rate;
    prevLimit = bracket.limit;
  }
  return tax;
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
  select.value = "";
}

document.addEventListener("DOMContentLoaded", () => {
  populateEmployeeDropdown();

  document.getElementById("add-employee-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("newEmployeeName").value.trim();
    const wage = parseFloat(document.getElementById("newEmployeeWage").value);
    if (!name) {
      alert("Please enter a valid employee name.");
      return;
    }
    if (isNaN(wage) || wage <= 0) {
      alert("Please enter a valid hourly wage.");
      return;
    }
    const employees = loadEmployees();
    employees.push({ name, wage, ytds: {} });
    saveEmployees(employees);
    populateEmployeeDropdown();
    e.target.reset();
  });

  document.getElementById("payroll-form").addEventListener("submit", (e) => {
    e.preventDefault();

    const employees = loadEmployees();
    const idx = parseInt(document.getElementById("employeeSelect").value);
    if (isNaN(idx) || idx < 0 || idx >= employees.length) {
      alert("Please select a valid employee.");
      return;
    }
    const emp = employees[idx];

    const payDateStr = document.getElementById("payDate").value;
    if (!payDateStr) {
      alert("Please enter a valid pay date.");
      return;
    }
    const payDate = new Date(payDateStr);
    const year = payDate.getFullYear();

    const cra = CRA_DATA[year] || CRA_DATA[2025];

    // Initialize YTD data structure if missing or new year
    if (!emp.ytds) emp.ytds = {};
    if (!emp.ytds[year]) {
      emp.ytds[year] = { ytdGross: 0, ytdCpp: 0, ytdEi: 0 };
    }
    const ytd = emp.ytds[year];

    // Parse inputs
    const hours = parseFloat(document.getElementById("hours").value);
    const tips = parseFloat(document.getElementById("tips").value) || 0;
    const commission = parseFloat(document.getElementById("commission").value) || 0;
    const period = document.getElementById("period").value.trim();

    if (isNaN(hours) || hours < 0) {
      alert("Please enter a valid number of hours worked.");
      return;
    }

    const basePay = hours * emp.wage;
    const grossPay = basePay + tips + commission;

    // Calculate annual gross including current pay period
    const annualGross = ytd.ytdGross + grossPay;

    // Calculate total federal and provincial tax BEFORE credits
    const totalFederalTax = calculateTax(annualGross, cra.federalTaxBrackets);
    const totalProvincialTax = calculateTax(annualGross, cra.ontarioTaxBrackets);

    // Calculate tax credits for personal amounts
    const federalTaxCredit = FEDERAL_PERSONAL_AMOUNT * cra.federalTaxBrackets[0].rate;
    const provincialTaxCredit = PROVINCIAL_PERSONAL_AMOUNT * cra.ontarioTaxBrackets[0].rate;

    // Adjust tax by subtracting tax credits (non-refundable tax credits)
    let adjFederalTax = Math.max(0, totalFederalTax - federalTaxCredit);
    let adjProvincialTax = Math.max(0, totalProvincialTax - provincialTaxCredit);

    // Calculate YTD taxes BEFORE credits for previous gross
    const prevFederalTax = calculateTax(ytd.ytdGross, cra.federalTaxBrackets);
    const prevProvincialTax = calculateTax(ytd.ytdGross, cra.ontarioTaxBrackets);

    let prevAdjFederalTax = Math.max(0, prevFederalTax - federalTaxCredit);
    let prevAdjProvincialTax = Math.max(0, prevProvincialTax - provincialTaxCredit);

    // Calculate taxes for current pay period (annualized difference divided by pay periods)
    let fedTax = (adjFederalTax - prevAdjFederalTax) / cra.payPeriodsPerYear;
    let ontTax = (adjProvincialTax - prevAdjProvincialTax) / cra.payPeriodsPerYear;

    fedTax = Math.max(0, fedTax);
    ontTax = Math.max(0, ontTax);

    // CPP Calculation:
    // Pensionable earnings = gross pay (no exemption prorated per period)
    const pensionableEarningsYTD = Math.max(0, ytd.ytdGross - cra.CPP_BASIC_EXEMPTION);
    const maxCppBase = cra.CPP_ANNUAL_MAX - cra.CPP_BASIC_EXEMPTION;
    const maxCppContribution = maxCppBase * cra.CPP_RATE;

    // CPP for this pay period = grossPay * rate, limited by max contribution - contributed YTD
    let cpp = grossPay * cra.CPP_RATE;
    if (pensionableEarningsYTD >= maxCppBase) {
      // Already maxed out CPP contributions this year
      cpp = 0;
    } else if (pensionableEarningsYTD + grossPay > maxCppBase) {
      // Partial CPP contribution to reach max this period
      cpp = (maxCppBase - pensionableEarningsYTD) * cra.CPP_RATE;
    }

    cpp = Math.max(0, cpp);

    // EI Calculation:
    const eiBaseRemaining = Math.max(0, cra.EI_ANNUAL_MAX - ytd.ytdGross);
    const eiGross = Math.min(grossPay, eiBaseRemaining);
    let ei = eiGross * cra.EI_RATE;
    const maxEi = cra.EI_ANNUAL_MAX * cra.EI_RATE;
    if (ytd.ytdEi + ei > maxEi) {
      ei = Math.max(0, maxEi - ytd.ytdEi);
    }
    ei = Math.max(0, ei);

    // Total deductions
    const totalDeductions = fedTax + ontTax + cpp + ei;
    const netPay = grossPay - totalDeductions;

    // Update YTD amounts
    ytd.ytdGross += grossPay;
    ytd.ytdCpp += cpp;
    ytd.ytdEi += ei;

    saveEmployees(employees);

    // Show pay stub
    document.getElementById("result").classList.remove("hidden");
    document.getElementById("paystub").innerHTML = `
      <p><strong>Company:</strong> SugaWax Zone</p>
      <p><strong>Pay Date:</strong> ${payDate.toLocaleDateString()}</p>
      <p><strong>Name:</strong> ${emp.name}</p>
      <p><strong>Pay Period:</strong> ${period}</p>
      <p><strong>Hours Worked:</strong> ${hours}</p>
      <p><strong>Hourly Rate:</strong> $${emp.wage.toFixed(2)}</p>
      <p><strong>Base Pay:</strong> $${basePay.toFixed(2)}</p>
      <p><strong>Tips:</strong> $${tips.toFixed(2)}</p>
      <p><strong>Commission:</strong> $${commission.toFixed(2)}</p>
      <hr class="my-2 border-violet-300" />
      <p><strong>Gross Pay:</strong> $${grossPay.toFixed(2)}</p>
      <p><strong>CPP:</strong> -$${cpp.toFixed(2)}</p>
      <p><strong>EI:</strong> -$${ei.toFixed(2)}</p>
      <p><strong>Federal Tax:</strong> -$${fedTax.toFixed(2)}</p>
      <p><strong>Ontario Tax:</strong> -$${ontTax.toFixed(2)}</p>
      <hr class="my-2 border-violet-300" />
      <p class="text-xl font-bold text-violet-700"><strong>Net Pay:</strong> $${netPay.toFixed(2)}</p>
    `;
  });
});
