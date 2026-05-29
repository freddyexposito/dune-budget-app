import { NextResponse } from 'next/server'
import { ACCOUNTS } from '@/config/accounts'

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json(ACCOUNTS)
}
