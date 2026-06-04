'use client'

import { WEALTH_CONFIG } from '@/config/wealth'

const { retirementGoal, assumedReturnRate, monthlyContributions, owners } = WEALTH_CONFIG

const anchorOwner       = Object.entries(owners).reduce((a, b) => a[1].targetAge >= b[1].targetAge ? a : b)
export const yearsToRetirement = anchorOwner[1].targetAge - anchorOwner[1].currentAge

function fmt(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}K`
  return `$${n.toFixed(0)}`
}

export function fvAtYear(pv: number, years: number): number {
  const r   = assumedReturnRate
  const pmt = monthlyContributions * 12
  const g   = Math.pow(1 + r, years)
  return pv * g + pmt * (g - 1) / r
}

function projectedPoints(currentTotal: number): { year: number; value: number }[] {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: yearsToRetirement + 1 }, (_, i) => ({
    year:  currentYear + i,
    value: fvAtYear(currentTotal, i),
  }))
}

export function TrajectoryChart({ currentTotal }: { currentTotal: number }) {
  const W = 560, H = 220
  const PAD = { top: 24, right: 70, bottom: 36, left: 64 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top  - PAD.bottom

  const points  = projectedPoints(currentTotal)
  const maxVal  = Math.max(retirementGoal * 1.05, points[points.length - 1].value * 1.05)
  const minYear = points[0].year
  const maxYear = points[points.length - 1].year

  const xS = (year:  number) => PAD.left + ((year  - minYear) / (maxYear - minYear)) * cW
  const yS = (value: number) => PAD.top  + cH - (value / maxVal) * cH

  const projPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${xS(p.year).toFixed(1)},${yS(p.value).toFixed(1)}`).join(' ')

  const yTicks   = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxVal)
  const xTicks   = points.filter((_, i) => i % 6 === 0).map((p) => p.year)
  const todayX   = xS(minYear)
  const goalY    = yS(retirementGoal)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ fontFamily: 'inherit' }}>
      {yTicks.map((v) => (
        <line key={v} x1={PAD.left} x2={PAD.left + cW} y1={yS(v)} y2={yS(v)} stroke="#f0f0f0" strokeWidth="1" />
      ))}
      <line x1={PAD.left} x2={PAD.left + cW} y1={goalY} y2={goalY} stroke="#9ca3af" strokeWidth="1.5" strokeDasharray="6 4" />
      <text x={PAD.left + cW + 6} y={goalY + 4} fontSize="10" fill="#9ca3af">Goal · {fmt(retirementGoal)}</text>
      <path
        d={`${projPath} L${xS(maxYear).toFixed(1)},${(PAD.top + cH).toFixed(1)} L${xS(minYear).toFixed(1)},${(PAD.top + cH).toFixed(1)} Z`}
        fill="#dbeafe" opacity="0.6"
      />
      <path d={projPath} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round" />
      <circle cx={todayX} cy={yS(currentTotal)} r="5" fill="#3b82f6" />
      <text x={todayX + 8} y={yS(currentTotal) - 6} fontSize="10" fill="#3b82f6">Today · {fmt(currentTotal)}</text>
      {yTicks.filter((v) => v > 0).map((v) => (
        <text key={v} x={PAD.left - 6} y={yS(v) + 4} fontSize="10" fill="#9ca3af" textAnchor="end">{fmt(v)}</text>
      ))}
      {xTicks.map((yr) => (
        <text key={yr} x={xS(yr)} y={PAD.top + cH + 18} fontSize="10" fill="#9ca3af" textAnchor="middle">{yr}</text>
      ))}
      <line x1={PAD.left} x2={PAD.left}      y1={PAD.top} y2={PAD.top + cH} stroke="#e5e7eb" strokeWidth="1" />
      <line x1={PAD.left} x2={PAD.left + cW} y1={PAD.top + cH} y2={PAD.top + cH} stroke="#e5e7eb" strokeWidth="1" />
    </svg>
  )
}
