// script.js

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

// Calculate tax from brackets
function calculateTax(income, brackets) {
  let tax = 0;
  let previousLimit = 0;
  for (const bracket of brackets) {
    if (income <= previousLimit) break;
    const taxableIncome = Math.min(income, bracket.limit) - previousLimit;
    tax += taxableIncome * bracket.rate;
    previousLimit = bracket.limit;
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

    // Parse pay date and year
    const payDateStr = document.getElementById("payDate").value;
    if (!payDateStr) {
      alert("Please enter a valid pay date.");
      return;
    }
    const payDate = new Date(payDateStr);
    const year = payDate.getFullYear();

    const cra = CRA_DATA[year] || CRA_DATA[2025];

    if (!emp.ytds) emp.ytds = {};
    if (!emp.ytds[year]) {
      emp.ytds[year] = { ytdGross: 0, ytdCpp: 0, ytdEi: 0 };
    }

    const ytd = emp.ytds[year];

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
    const annualGross = ytd.ytdGross + grossPay;

    const fedTax = Math.max(
      0,
      (calculateTax(annualGross, cra.federalTaxBrackets) - calculateTax(ytd.ytdGross, cra.federalTaxBrackets)) / cra.payPeriodsPerYear
    );
    const ontTax = Math.max(
      0,
      (calculateTax(annualGross, cra.ontarioTaxBrackets) - calculateTax(ytd.ytdGross, cra.ontarioTaxBrackets)) / cra.payPeriodsPerYear
    );

    // CPP calculation
    const totalPensionable = Math.max(0, annualGross - cra.CPP_BASIC_EXEMPTION);
    const ytdPensionable = Math.max(0, ytd.ytdGross - cra.CPP_BASIC_EXEMPTION);
    let cpp = Math.min(grossPay, totalPensionable - ytdPensionable) * cra.CPP_RATE;
    const maxCpp = (cra.CPP_ANNUAL_MAX - cra.CPP_BASIC_EXEMPTION) * cra.CPP_RATE;
    if (ytd.ytdCpp + cpp > maxCpp) cpp = maxCpp - ytd.ytdCpp;
    if (cpp < 0) cpp = 0;

    // EI calculation
    let eiBase = Math.max(0, cra.EI_ANNUAL_MAX - ytd.ytdGross);
    let ei = Math.min(grossPay, eiBase) * cra.EI_RATE;
    const maxEi = cra.EI_ANNUAL_MAX * cra.EI_RATE;
    if (ytd.ytdEi + ei > maxEi) ei = maxEi - ytd.ytdEi;
    if (ei < 0) ei = 0;

    const totalDeductions = fedTax + ontTax + cpp + ei;
    const netPay = grossPay - totalDeductions;

    // Update YTD
    ytd.ytdGross += grossPay;
    ytd.ytdCpp += cpp;
    ytd.ytdEi += ei;
    saveEmployees(employees);

    // Show paystub
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
