# Baker Finance

A web-based finance reconciliation tool that helps match sales data with payout records, calculate fees, refunds, and adjustments, and generate detailed reconciliation reports.

## Features

- Upload and process CSV/Excel sales and payout files
- Automatic order matching between sales and payouts
- Fee calculation and breakdown analysis
- Refund and adjustment tracking
- Interactive data visualization with charts
- Export reconciliation results

## Tech Stack

- **Framework**: Next.js 16 with TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: React with Framer Motion animations
- **Charts**: Recharts
- **File Processing**: PapaParse (CSV), XLSX (Excel)
- **Icons**: Lucide React

## Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd baker-finance
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

## Usage

1. Upload your sales CSV file containing order data
2. Upload one or more payout files (CSV/Excel) from payment processors
3. Click "Process Reconciliation" to match orders and calculate discrepancies
4. Review the results, including matched orders, fees, refunds, and adjustments
5. Export the reconciliation report if needed

## API

The application includes a reconciliation API endpoint at `/api/reconcile` that processes uploaded files and returns detailed reconciliation data.