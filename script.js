// script.js

const payPeriodsPerYear = 26; // bi-weekly pay period

// Tax brackets/functions (2025)
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

// CPP & EI constants (2025)
const CPP_ANNUAL_MAX = 68500;
const CPP_BASIC_EXEMPTION = 3500;
const CPP_RATE = 0.0595;

const EI_ANNUAL_MAX = 63200;
const EI_RATE = 0.0166;

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("payroll-form");
  const resultSection = document.getElementById("result");
  const paystubContainer = document.getElementById("paystub");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Inputs
    const name = document.getElementById("name").value;
    const hours = parseFloat(document.getElementById("hours").value);
    const wage = parseFloat(document.getElementById("wage").value);
    const tips = parseFloat(document.getElementById("tips").value) || 0;
    const commission = parseFloat(document.getElementById("commission").value) || 0;
    const period = document.getElementById("period").value;

    // YTD Inputs
    const ytdGross = parseFloat(document.getElementById("ytdGross")?.value) || 0;
    const ytdCpp = parseFloat(document.getElementById("ytdCpp")?.value) || 0;
    const ytdEi = parseFloat(document.getElementById("ytdEi")?.value) || 0;

    // Gross pay
    const basePay = hours * wage;
    const grossPay = basePay + tips + commission;

    // Annualize gross pay for tax calculations
    const annualGross = (ytdGross + grossPay);

    // Calculate annual federal and provincial taxes on annual income
    const annualFedTax = federalTaxAnnual(annualGross);
    const annualOntTax = ontarioTaxAnnual(annualGross);

    // Calculate tax on YTD income only (previous taxes)
    const annualFedTaxYTD = federalTaxAnnual(ytdGross);
    const annualOntTaxYTD = ontarioTaxAnnual(ytdGross);

    // Tax due this pay period is difference between total annual tax and YTD tax
    let fedTax = (annualFedTax - annualFedTaxYTD) / payPeriodsPerYear;
    let ontTax = (annualOntTax - annualOntTaxYTD) / payPeriodsPerYear;

    // Make sure taxes are not negative (in case YTD is high)
    fedTax = Math.max(0, fedTax);
    ontTax = Math.max(0, ontTax);

    // CPP Deduction calculation with YTD
    let totalPensionableEarnings = Math.max(0, annualGross - CPP_BASIC_EXEMPTION);
    let ytdPensionableEarnings = Math.max(0, ytdGross - CPP_BASIC_EXEMPTION);
    let pensionableThisPeriod = totalPensionableEarnings - ytdPensionableEarnings;
    pensionableThisPeriod = Math.min(pensionableThisPeriod, grossPay);
    pensionableThisPeriod = Math.max(0, pensionableThisPeriod);

    let cpp = pensionableThisPeriod * CPP_RATE;

    // Cap CPP at max for the year minus what’s already deducted
    const maxCppDeductible = (CPP_ANNUAL_MAX - CPP_BASIC_EXEMPTION) * CPP_RATE;
    if (ytdCpp + cpp > maxCppDeductible) {
      cpp = Math.max(0, maxCppDeductible - ytdCpp);
    }

    // EI Deduction calculation with YTD
    let remainingEiInsurable = Math.max(0, EI_ANNUAL_MAX - ytdGross);
    let eiDeductible = Math.min(grossPay, remainingEiInsurable);
    let ei = eiDeductible * EI_RATE;

    // Cap EI at max for the year minus what’s already deducted
    const maxEiDeductible = EI_ANNUAL_MAX * EI_RATE;
    if (ytdEi + ei > maxEiDeductible) {
      ei = Math.max(0, maxEiDeductible - ytdEi);
    }

    // Total deductions and net pay
    const totalDeductions = cpp + ei + fedTax + ontTax;
    const netPay = grossPay - totalDeductions;

    // Store payroll data (optional)
    // payrollData.push({ name, hours, wage, tips, commission, ytdGross, ytdCpp, ytdEi, grossPay, cpp, ei, fedTax, ontTax, totalDeductions, netPay, period });

    // Generate pay stub HTML
    const stubHTML = `
      <p><strong>Company:</strong> SugaWax Zone</p>
      <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Pay Period:</strong> ${period}</p>
      <p><strong>Hours Worked:</strong> ${hours}</p>
      <p><strong>Hourly Rate:</strong> $${wage.toFixed(2)}</p>
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

    paystubContainer.innerHTML = stubHTML;
    resultSection.classList.remove("hidden");
    form.reset();
  });
});
