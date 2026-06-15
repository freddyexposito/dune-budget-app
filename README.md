This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Adding a new category

Three files need to be updated:

1. **`components/TransactionTable.tsx`** — add an entry to `CATEGORY_COLORS` (the object at the top of the file) with a Tailwind bg+text color pair. `CATEGORIES` is derived from this object automatically.

2. **`components/BudgetTab.tsx`** — add the category name to the `CATEGORIES` array near the top of the file so it appears in the budget editor.

3. **`components/RulesTab.tsx`** — add the category name to the `CATEGORIES` array near the top of the file so it appears in the rule-assignment dropdown.

Keep the names identical across all three files.

## Deploying updates

This app runs self-hosted on a home Linux box (via pm2 + ngrok), not on Vercel — the SQLite database lives only on that machine.

To push out a code update, SSH into the box and run:

```bash
~/dune-budget-app/deploy.sh
```

This pulls the latest code from GitHub, installs dependencies, builds, and restarts the app via pm2.
