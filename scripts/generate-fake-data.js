#!/usr/bin/env node

// Generate realistic fake financial data for testing

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prompt for user confirmation
function confirm(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// Helper to get first day of month N months ago
function monthsAgo(n) {
    const date = new Date();
    date.setMonth(date.getMonth() - n);
    date.setDate(1);
    return date;
}

// Generate cash data (checking account with realistic fluctuations)
function generateCashData() {
    const data = [];
    let balance = 2000;

    for (let i = 36; i >= 0; i--) {
        const date = monthsAgo(i);
        balance += Math.floor(Math.random() * 5000) - 2000;
        balance = Math.max(500, balance);

        data.push({
            date: formatDate(date),
            account: '/bank/checking',
            value: balance.toFixed(2)
        });
    }

    return data;
}

// Generate property data (house value with slow appreciation + rental property)
function generatePropertyData() {
    const data = [];
    let houseValue = 300000;
    let rentalValue = 200000;

    for (let i = 36; i >= 0; i--) {
        const date = monthsAgo(i);
        houseValue += (houseValue * 0.004) + (Math.random() * 2000 - 1000);
        rentalValue += (rentalValue * 0.003) + (Math.random() * 1500 - 750);

        data.push({
            date: formatDate(date),
            account: '/property/house',
            value: houseValue.toFixed(2)
        });

        data.push({
            date: formatDate(date),
            account: '/property/rental',
            value: rentalValue.toFixed(2)
        });
    }

    return data;
}

// Generate debt data (mortgage decreasing over time)
function generateDebtData() {
    const data = [];
    let balance = -280000;

    for (let i = 36; i >= 0; i--) {
        const date = monthsAgo(i);
        balance += Math.floor(Math.random() * 200) + 800;

        data.push({
            date: formatDate(date),
            account: '/house/mortgage',
            value: balance.toFixed(2)
        });
    }

    return data;
}

// Generate securities data (401k, Roth IRA, and brokerage with market volatility)
function generateSecuritiesData() {
    const data = [];
    let balance401k = 50000;
    let balanceBrokerage = 30000;
    let balanceRothIra = 15000;

    for (let i = 36; i >= 0; i--) {
        const date = monthsAgo(i);

        balance401k += 500 + (balance401k * (Math.random() * 0.04 - 0.01));
        balanceBrokerage += 200 + (balanceBrokerage * (Math.random() * 0.04 - 0.01));
        balanceRothIra += 100 + (balanceRothIra * (Math.random() * 0.04 - 0.01));

        data.push({
            date: formatDate(date),
            account: '/fidelity/401k',
            value: balance401k.toFixed(2)
        });

        data.push({
            date: formatDate(date),
            account: '/fidelity/brokerage',
            value: balanceBrokerage.toFixed(2)
        });

        data.push({
            date: formatDate(date),
            account: '/fidelity/roth_ira',
            value: balanceRothIra.toFixed(2)
        });
    }

    return data;
}

// Generate credit card spending (variable monthly spending)
function generateCreditData() {
    const data = [];

    for (let i = 36; i >= 0; i--) {
        const date = monthsAgo(i);

        const spending = -(Math.floor(Math.random() * 3000) + 1000);
        const numTransactions = Math.floor(Math.random() * 4) + 2;
        const perTransaction = spending / numTransactions;

        for (let j = 0; j < numTransactions; j++) {
            data.push({
                date: formatDate(date),
                account: '/visa/credit_card',
                value: perTransaction.toFixed(2)
            });
        }
    }

    return data;
}

// Generate income data (annual totals)
function generateIncomeData() {
    const currentYear = new Date().getFullYear();
    const data = [];
    let income = 110000;

    for (let year = currentYear - 4; year <= currentYear; year++) {
        income = Math.round(income * (1 + Math.random() * 0.05 + 0.02));
        const federalTax = Math.round(income * 0.22);
        const stateTax = Math.round(income * 0.055);
        const socialSecurity = Math.round(Math.min(income, 160200) * 0.062);
        const medicare = Math.round(income * 0.0145);

        data.push({
            year,
            total_income: income,
            federal_income_tax: federalTax,
            state_income_tax: stateTax,
            social_security: socialSecurity,
            medicare: medicare
        });
    }

    return data;
}

// Generate savings data (annual contributions by account, including a withdrawal year)
function generateSavingsData() {
    const currentYear = new Date().getFullYear();
    const withdrawalYear = currentYear - 2;
    const data = [];

    for (let year = currentYear - 4; year <= currentYear; year++) {
        data.push({
            year,
            account: '/fidelity/401k',
            amount: Math.round(20000 + Math.random() * 3000)
        });

        data.push({
            year,
            account: '/fidelity/roth_ira',
            amount: Math.round(6000 + Math.random() * 1000)
        });

        data.push({
            year,
            account: '/fidelity/brokerage',
            amount: Math.round(5000 + Math.random() * 5000)
        });

        // Withdrawal in one year to exercise the negative-bar feature
        if (year === withdrawalYear) {
            data.push({
                year,
                account: '/fidelity/brokerage',
                amount: -Math.round(8000 + Math.random() * 4000)
            });
        }
    }

    return data;
}

// Generate manifest as YAML
function generateManifestYAML() {
    return `accounts:
  /bank/checking:
    type: cash
    retirement: false
    title: Checking Account

  /visa/credit_card:
    type: debt
    retirement: false
    title: Visa Credit Card

  /house/mortgage:
    type: debt
    retirement: false
    debt_applies_to: /property/house
    title: Home Mortgage

  /property/house:
    type: property
    retirement: false
    primary_residence_since: 2020-01-01
    title: Primary Home

  /property/rental:
    type: property
    retirement: false
    primary_residence_since: 2022-01-01
    primary_residence_until: 2023-06-30
    title: Rental Property

  /fidelity/401k:
    type: securities
    retirement: true
    tax_treatment: pre-tax
    title: 401(k)

  /fidelity/roth_ira:
    type: securities
    retirement: true
    tax_treatment: roth
    title: Roth IRA

  /fidelity/brokerage:
    type: securities
    retirement: false
    title: Brokerage Account
`;
}

// Convert array to CSV
function arrayToCSV(data) {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(obj =>
        headers.map(header => obj[header]).join(',')
    );

    return [headers.join(','), ...rows].join('\n');
}

// Check if data directory exists and has files
function hasExistingData(dataDir) {
    if (!fs.existsSync(dataDir)) {
        return false;
    }
    const files = fs.readdirSync(dataDir);
    return files.some(f => f.endsWith('.csv') || f.endsWith('.yaml'));
}

// Main
async function main() {
    const dataDir = path.join(__dirname, '..', 'data');

    // Check for existing data and confirm deletion
    if (hasExistingData(dataDir)) {
        console.log('⚠️  Warning: data/ folder already exists with data files.');
        console.log('This will DELETE your existing financial data!');
        console.log('');

        const proceed = await confirm('Continue? (y/N) ');

        if (!proceed) {
            console.log('Cancelled.');
            process.exit(0);
        }

        console.log('Deleting existing data...');
        fs.rmSync(dataDir, { recursive: true, force: true });
    }

    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('Generating fake financial data...');

    const csvDatasets = {
        'cash.csv': generateCashData(),
        'property.csv': generatePropertyData(),
        'debt.csv': generateDebtData(),
        'securities.csv': generateSecuritiesData(),
        'credit.csv': generateCreditData(),
        'income.csv': generateIncomeData(),
        'savings.csv': generateSavingsData()
    };

    Object.entries(csvDatasets).forEach(([filename, data]) => {
        const csv = arrayToCSV(data);
        const filepath = path.join(dataDir, filename);
        fs.writeFileSync(filepath, csv);
        console.log(`✓ Generated ${filename} (${data.length} rows)`);
    });

    const manifestPath = path.join(dataDir, 'manifest.yaml');
    fs.writeFileSync(manifestPath, generateManifestYAML());
    console.log('✓ Generated manifest.yaml');

    console.log('\nFake data generated successfully!');
    console.log('Run `just serve` to view the dashboard.');
}

main();
