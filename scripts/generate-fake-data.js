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
        // Random fluctuation between -2000 and +3000
        balance += Math.floor(Math.random() * 5000) - 2000;
        balance = Math.max(500, balance); // Keep minimum balance

        data.push({
            date: formatDate(date),
            account: '/bank/checking',
            value: balance.toFixed(2)
        });
    }

    return data;
}

// Generate property data (house value with slow appreciation)
function generatePropertyData() {
    const data = [];
    let value = 300000;

    for (let i = 36; i >= 0; i--) {
        const date = monthsAgo(i);
        // Slow appreciation ~3-5% annually, with monthly noise
        value += (value * 0.004) + (Math.random() * 2000 - 1000);

        data.push({
            date: formatDate(date),
            account: '/property/house',
            value: value.toFixed(2)
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
        // Monthly principal reduction of ~$800-1000
        balance += Math.floor(Math.random() * 200) + 800;

        data.push({
            date: formatDate(date),
            account: '/house/mortgage',
            value: balance.toFixed(2)
        });
    }

    return data;
}

// Generate securities data (401k and brokerage with market volatility)
function generateSecuritiesData() {
    const data = [];
    let balance401k = 50000;
    let balanceBrokerage = 30000;

    for (let i = 36; i >= 0; i--) {
        const date = monthsAgo(i);

        // Monthly contribution + market gains/losses
        balance401k += 500 + (balance401k * (Math.random() * 0.04 - 0.01));
        balanceBrokerage += 200 + (balanceBrokerage * (Math.random() * 0.04 - 0.01));

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
    }

    return data;
}

// Generate credit card spending (variable monthly spending)
function generateCreditData() {
    const data = [];

    for (let i = 36; i >= 0; i--) {
        const date = monthsAgo(i);

        // Random spending between $1000 and $4000 per month
        const spending = -(Math.floor(Math.random() * 3000) + 1000);

        // Split into 2-5 transactions
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

// Generate manifest
function generateManifest() {
    return [
        {
            account: '/bank/checking',
            type: 'cash',
            retirement: 'false',
            debt_applies_to: '',
            primary_residence: ''
        },
        {
            account: '/visa/credit_card',
            type: 'debt',
            retirement: 'false',
            debt_applies_to: '',
            primary_residence: ''
        },
        {
            account: '/house/mortgage',
            type: 'debt',
            retirement: 'false',
            debt_applies_to: '/property/house',
            primary_residence: ''
        },
        {
            account: '/property/house',
            type: 'property',
            retirement: 'false',
            debt_applies_to: '',
            primary_residence: 'true'
        },
        {
            account: '/fidelity/401k',
            type: 'securities',
            retirement: 'true',
            debt_applies_to: '',
            primary_residence: ''
        },
        {
            account: '/fidelity/brokerage',
            type: 'securities',
            retirement: 'false',
            debt_applies_to: '',
            primary_residence: ''
        }
    ];
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
    return files.some(f => f.endsWith('.csv'));
}

// Main
async function main() {
    const dataDir = path.join(__dirname, '..', 'data');

    // Check for existing data and confirm deletion
    if (hasExistingData(dataDir)) {
        console.log('⚠️  Warning: data/ folder already exists with CSV files.');
        console.log('This will DELETE your existing financial data!');
        console.log('');

        const proceed = await confirm('Continue? (y/N) ');

        if (!proceed) {
            console.log('Cancelled.');
            process.exit(0);
        }

        // Delete existing data
        console.log('Deleting existing data...');
        fs.rmSync(dataDir, { recursive: true, force: true });
    }

    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('Generating fake financial data...');

    const datasets = {
        'cash.csv': generateCashData(),
        'property.csv': generatePropertyData(),
        'debt.csv': generateDebtData(),
        'securities.csv': generateSecuritiesData(),
        'credit.csv': generateCreditData(),
        'manifest.csv': generateManifest()
    };

    Object.entries(datasets).forEach(([filename, data]) => {
        const csv = arrayToCSV(data);
        const filepath = path.join(dataDir, filename);
        fs.writeFileSync(filepath, csv);
        console.log(`✓ Generated ${filename} (${data.length} rows)`);
    });

    console.log('\nFake data generated successfully!');
    console.log('Run `just serve` to view the dashboard.');
}

main();
