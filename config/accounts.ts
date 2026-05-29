export interface AccountConfig {
  acctId:   string   // must match ACCTID in the QFX file exactly
  nickname: string   // display name in the UI
  acctType: string   // "CREDITCARD" | "SAVINGS" | "CHECKING"
  currency: string
}

/**
 * Only transactions belonging to these accounts will be imported.
 * Anything else in the QFX file (spouse's card, etc.) is silently skipped.
 *
 * To find your acctId: import a QFX once, check the console or server log,
 * or open the QFX file and look for <ACCTID>.
 */
export const ACCOUNTS: AccountConfig[] = [
  {
    acctId:   '5524903604242496',
    nickname: 'Westjet Freddy',
    acctType: 'CREDITCARD',
    currency: 'CAD',
  },
  {
    acctId:   '4512238611058628',
    nickname: 'Visa Freddy',
    acctType: 'CREDITCARD',
    currency: 'CAD',
  },
  // add more accounts here as needed
]

export function findAccount(acctId: string): AccountConfig | undefined {
  return ACCOUNTS.find((a) => a.acctId === acctId)
}
