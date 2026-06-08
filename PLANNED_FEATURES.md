# Planned Features

## Wealth / Retirement Dashboard ✅ (built)

A **"Wealth" tab** alongside the existing budget tabs, giving both household members a monthly snapshot of savings, investments, and retirement trajectory.

- Accounts grouped by Retirement / Tax-Free / Cash / Education
- Monthly balance snapshots — click any balance to edit inline
- Retirement projection chart (compound growth + monthly contributions)
- "On pace" badge
- RESP balances for Antonio and Nicolas

---

## Government Income Panel (CPP + OAS)

To be added to the Wealth tab as a separate "Government income at retirement" panel.

### CPP
- Freddy and Yirina both have CPP based on contribution history
- Earliest at 60 (36% permanent reduction), full at 65, enhanced at 70 (+42%)
- Yirina retiring at 60: decision point — take CPP at 60 (reduced) or wait until 65 (full)
  - Break-even age ~74: if she expects to live past 74, waiting is better
- Store estimated CPP at 65 per person in config; app shows adjusted amount based on chosen take age

### OAS
- Starts at 65 minimum — **Yirina retiring at 60 gets zero OAS for 5 years**
- Both are immigrants — OAS is prorated: years of Canadian residency ÷ 40 × full amount
  - **Yirina:** arrived at 30 → 35 years by 65 → **87.5%** of full OAS (~$7,760/yr in 2026 dollars)
  - **Freddy:** arrived at 35 → 30 years by 65 → **75%** of full OAS (~$6,650/yr in 2026 dollars)
  - Combined household OAS: ~$14,410/yr (vs $17,740 if both had full 40 years)
- **Freddy tip:** delaying OAS to 70 adds 5 more residency years (30→35 = 87.5%) + 36% delay bonus
- Project to retirement year using 2% inflation: today's amount × (1.02)^n — label clearly as estimate

### Config fields needed (per person)
- `arrivalAge` — to calculate prorated OAS
- `estimatedCPP65` — from Service Canada statement
- `oasTakeAge` — 65 or 70 (affects delay bonus)
- `cppTakeAge` — 60, 65, or 70

### How it reduces the portfolio target
- Total desired retirement income − CPP (both) − OAS (both) = amount portfolio must cover
- At 4% safe withdrawal rate → required portfolio = annual gap ÷ 0.04
- Show this as "effective target" alongside the raw $1.6M goal

---


## Deployment (Linux box + ngrok)

When ready to move off the dev laptop and onto the home Linux box:

### App
- Run Next.js under **pm2** so it starts on boot and restarts on crash:
```bash
npm install -g pm2
pm2 start "npm start" --name dune-budget
pm2 save
pm2 startup   # run the command it outputs
```

### ngrok
```bash
pm2 start "ngrok http 3000 --domain=xxx.ngrok-free.app --basic-auth='user:pass'" --name dune-ngrok
pm2 save
```

### Code updates (GitHub → Linux box)
- Repo cloned via SSH key on the Linux box
- Update workflow:
```bash
git pull && npm install && npm run build && pm2 restart dune-budget
```
- Add a `deploy.sh` script to the repo for convenience

### Database migration (one-time)
```bash
scp budget.db user@linuxbox:/path/to/app/budget.db
```
DB lives on the Linux box permanently — never touched by `git pull` (already in `.gitignore`)

---

## Database Backups

### 1. Local cron backup (daily)
Add to crontab on the Linux box (`crontab -e`):
```
0 2 * * * cp /path/to/app/budget.db /path/to/backups/budget_$(date +\%Y-\%m-\%d).db && find /path/to/backups -name "*.db" -mtime +30 -delete
```
- Runs every night at 2am
- Keeps last 30 days of snapshots
- Older files auto-deleted

### 2. Offsite backup with rclone → Google Drive (weekly)
Install rclone and connect to Google Drive once:
```bash
sudo apt install rclone
rclone config   # follow prompts to add Google Drive as "gdrive"
```
Add to crontab (runs every Sunday at 3am):
```
0 3 * * 0 rclone copy /path/to/backups gdrive:dune-budget-backups
```
- Syncs the local backups folder to a `dune-budget-backups` folder in Google Drive
- Free Google Drive tier (15GB) is more than enough — DB is tiny
- Gives offsite protection if the Linux box dies entirely
