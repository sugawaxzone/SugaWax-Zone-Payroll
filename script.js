// script.js

// Array to store payroll entries
const payrollData = [];

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("payroll-form");
  const resultSection = document.getElementById("result");
  const paystubContainer = document.getElementById("paystub");

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    // Get input values
    const name = document.getElementById("name").value;
    const hours = parseFloat(document.getElementById("hours").value);
    const wage = parseFloat(document.getElementById("wage").value);
    const tips = parseFloat(document.getElementById("tips").value) || 0;
    const commission = parseFloat(document.getElementById("commission").value) || 0;
    const period = document.getElementById("period").value;

    // --- Earnings ---
    const basePay = hours * wage;
    const grossPay = basePay + tips + commission;

    // --- CPP Calculation (2025) ---
    const cppExempt = 3500 / 26; // basic exemption for bi-weekly pay
    const cppMaxEarnings = 68500 / 26;
    const pensionableEarnings = Math.max(0, Math.min(grossPay - cppExempt, cppMaxEarnings));
    const cpp = pensionableEarnings * 0.0595;

    // --- EI Calculation (2025) ---
    const eiMaxEarnings = 63200 / 26;
    const ei = Math.min(grossPay, eiMaxEarnings) * 0.0166;

    // --- Federal Tax (2025) ---
    let fedTax = 0;
    if (grossPay <= 55867 / 26) {
      fedTax = grossPay * 0.15;
    } else if (grossPay <= 111733 / 26) {
      fedTax = (55867 / 26) * 0.15 + (grossPay - (55867 / 26)) * 0.205;
    } else {
      fedTax =
        (55867 / 26) * 0.15 +
        ((111733 - 55867) / 26) * 0.205 +
        (grossPay - (111733 / 26)) * 0.26;
    }

    // --- Ontario Tax (2025) ---
    let ontTax = 0;
    if (grossPay <= 51446 / 26) {
      ontTax = grossPay * 0.0505;
    } else if (grossPay <= 102894 / 26) {
      ontTax = (51446 / 26) * 0.0505 + (grossPay - (51446 / 26)) * 0.0915;
    } else {
      ontTax =
        (51446 / 26) * 0.0505 +
        ((102894 - 51446) / 26) * 0.0915 +
        (grossPay - (102894 / 26)) * 0.1116;
    }

    // --- Final Deductions & Net Pay ---
    const totalDeductions = cpp + ei + fedTax + ontTax;
    const netPay = grossPay - totalDeductions;

    // --- Store employee payroll entry ---
    const employee = {
      name,
      hours,
      wage,
      tips,
      commission,
      basePay,
      grossPay,
      cpp,
      ei,
      fedTax,
      ontTax,
      totalDeductions,
      netPay,
      period,
    };
    payrollData.push(employee);

    // --- Generate pay stub ---
    const stubHTML = `
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

    // Optional: Clear form
    form.reset();
  });
});
