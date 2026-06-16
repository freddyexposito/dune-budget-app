export type AccountType  = 'RRSP' | 'LIRA' | 'TFSA' | 'HISA' | 'DC' | 'CHECKING' | 'RESP'
export type AccountGroup = 'RETIREMENT' | 'TAX-FREE' | 'CASH' | 'EDUCATION'

export interface WealthAccount {
  id:               string
  name:             string
  owner:            string          // 'Yirina' | 'Freddy' | 'Joint'
  type:             AccountType
  group:            AccountGroup
  contributionRoom?: number         // RRSP / TFSA only — update after each tax season
}

export interface OwnerConfig {
  currentAge: number
  targetAge:  number
}

export interface WealthConfig {
  retirementGoal:       number
  assumedReturnRate:    number
  monthlyContributions: number
  owners:               Record<string, OwnerConfig>
  accounts:             WealthAccount[]
}

export const WEALTH_CONFIG: WealthConfig = {
  retirementGoal:        1_600_000,
  assumedReturnRate:     0.06,
  monthlyContributions:  2_000,   // combined household monthly contributions to retirement accounts

  // ── Update these each year ──────────────────────────────────────────────────
  // Both retire the same year: Freddy at 65, Yirina at 60 (same calendar year)
  owners: {
    Freddy: { currentAge: 48, targetAge: 65 },
    Yirina: { currentAge: 43, targetAge: 60 },
  },

  // ── Update contribution room after each tax season ──────────────────────────
  accounts: [
    { id: 'rrsp-yirina',    name: 'RRSP — Yirina',     owner: 'Yirina', type: 'RRSP',     group: 'RETIREMENT', contributionRoom: 42_000 },
    { id: 'lira-yirina',   name: 'LIRA — Yirina',     owner: 'Yirina', type: 'LIRA',     group: 'RETIREMENT' },
    { id: 'rrsp-freddy',    name: 'RRSP — Freddy',     owner: 'Freddy', type: 'RRSP',     group: 'RETIREMENT', contributionRoom: 28_000 },
    { id: 'rrsp-spousal-freddy', name: 'RRSP Spousal — Freddy', owner: 'Freddy', type: 'RRSP', group: 'RETIREMENT' },
    { id: 'rrsp-spousal-yirina', name: 'RRSP Spousal — Yirina', owner: 'Yirina', type: 'RRSP', group: 'RETIREMENT' },
    { id: 'dc-plan',        name: 'DC Plan',            owner: 'Freddy', type: 'DC',       group: 'RETIREMENT' },
    { id: 'tfsa-yirina',    name: 'TFSA — Yirina',     owner: 'Yirina', type: 'TFSA',     group: 'TAX-FREE',   contributionRoom: 14_000 },
    { id: 'tfsa-freddy',    name: 'TFSA — Freddy',     owner: 'Freddy', type: 'TFSA',     group: 'TAX-FREE',   contributionRoom: 11_000 },
    { id: 'hisa-emergency', name: 'HISA — Emergency',  owner: 'Joint',  type: 'HISA',     group: 'CASH' },
    { id: 'hisa-exp',       name: 'HISA — Experience', owner: 'Joint',  type: 'HISA',     group: 'CASH' },
    { id: 'checking',       name: 'Checking',           owner: 'Joint',  type: 'CHECKING', group: 'CASH' },

    { id: 'resp-antonio',  name: 'RESP — Antonio',     owner: 'Joint',  type: 'RESP',     group: 'EDUCATION' },
    { id: 'resp-nico',     name: 'RESP — Nicolas',     owner: 'Joint',  type: 'RESP',     group: 'EDUCATION' },
  ],
}
