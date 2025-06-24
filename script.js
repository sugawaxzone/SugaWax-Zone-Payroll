// script.js

// Payroll entries will be stored here temporarily (can also use localStorage)
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

    // Calculate total earnings
    const basePay = hours * wage;
    const grossPay = basePay + tips + commission;

    // Store data temporarily
    const employee = {
      name,
      hours,
      wage,
      tips,
      commission,
      basePay,
      grossPay,
      period
    };
    payrollData.push(employee);

    // Display pay stub
    const stubHTML = `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Pay Period:</strong> ${period}</p>
      <p><strong>Hours Worked:</strong> ${hours}</p>
      <p><strong>Hourly Rate:</strong> $${wage.toFixed(2)}</p>
      <p><strong>Base Pay:</strong> $${basePay.toFixed(2)}</p>
      <p><strong>Tips:</strong> $${tips.toFixed(2)}</p>
      <p><strong>Commission:</strong> $${commission.toFixed(2)}</p>
      <p class="font-bold text-lg"><strong>Gross Pay:</strong> $${grossPay.toFixed(2)}</p>
      <p class="text-gray-500">(Deductions and net pay will be shown in Part 3)</p>
    `;
    paystubContainer.innerHTML = stubHTML;
    resultSection.classList.remove("hidden");

    // Optional: Reset form
    form.reset();
  });
});
