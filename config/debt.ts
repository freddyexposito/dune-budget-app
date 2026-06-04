export type DebtType = 'MORTGAGE' | 'AUTO' | 'TFSA_OFFSET'

export interface DebtAccount {
  id:             string
  name:           string
  type:           DebtType
  originalAmount: number    // starting balance (for % paid off)
}

export interface DebtConfig {
  accounts: DebtAccount[]
}

export const DEBT_CONFIG: DebtConfig = {
  accounts: [
    { id: 'mortgage',     name: 'Mortgage',          type: 'MORTGAGE',     originalAmount: 600_000 },
    { id: 'car',          name: 'Car Loan',           type: 'AUTO',         originalAmount:  50_000 },
    { id: 'tfsa-offset',  name: 'TFSA — Loan offset', type: 'TFSA_OFFSET',  originalAmount:       0 },
  ],
}
