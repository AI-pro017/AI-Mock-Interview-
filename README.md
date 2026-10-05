# AI Mock Interview

Practice job interviews out loud with an AI interviewer, then get feedback on how you did.

You set up an interview by choosing the role, difficulty, focus area, length and style. An AI interviewer then runs the session by voice. It asks questions, listens to your answers and follows up the way a real interviewer would. When you finish, you get a breakdown of how each answer went and what to work on next.

There is also a copilot mode for real interviews. It listens to your mic and the call audio, transcribes both sides live and suggests answers as the conversation goes.

## Features

- **Voice mock interviews.** Questions are tailored to the role you pick. The interviewer speaks through ElevenLabs, and your answers are transcribed with Deepgram. Each session gets an interviewer persona with its own name and style.
- **Feedback and history.** Every session is scored with notes on each answer. Past interviews are saved so you can see your progress over time.
- **Interview copilot.** Captures mic and tab audio, shows a live transcript and gives AI answer suggestions next to it.
- **Profile and resume upload.** Upload a PDF or Word resume and the app fills in your profile from it.
- **Personality quiz.** A short questionnaire that matches you to a work style.
- **Job search.** Browse openings through the Adzuna API.
- **Accounts.** Email and password sign up with email verification, Google sign in and password reset.
- **Subscriptions.** Stripe checkout with Starter, Pro and Unlimited plans, each with its own usage limits.
- **Admin panel.** Manage users, credits and plans, watch live sessions, edit questions, job roles and copilot prompts, and export reports.

## Tech stack

- Next.js 14 (App Router), React 18, Tailwind CSS, Radix UI
- Auth.js (NextAuth v5) with Google and email/password sign in
- PostgreSQL on Neon with Drizzle ORM
- OpenAI and Google Gemini for questions, feedback and suggestions
- Deepgram for speech to text and ElevenLabs for text to speech
- Stripe for payments, SendGrid and Resend for email

## Getting started

You will need Node.js 18 or newer, a Postgres database (Neon works well) and API keys for the services listed above.

```bash
git clone https://github.com/AI-pro017/AI-Mock-Interview-.git
cd AI-Mock-Interview-
npm install
```

Create a `.env.local` file in the project root:

```env
# Database
NEXT_PUBLIC_DRIZZLE_DB_URL=postgresql://...

# Auth
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# AI and voice
OPENAI_API_KEY=
NEXT_PUBLIC_GEMINI_API_KEY=
DEEPGRAM_API_KEY=
ELEVENLABS_API_KEY=

# Email
SENDGRID_API_KEY=
SENDGRID_VERIFIED_SENDER=
RESEND_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_STARTER_PRICE_ID=
STRIPE_PRO_PRICE_ID=
STRIPE_UNLIMITED_PRICE_ID=

# App URLs
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_URL=http://localhost:3000

# Optional
NEXT_PUBLIC_ADZUNA_APP_ID=
NEXT_PUBLIC_ADZUNA_APP_KEY=
NEXT_PUBLIC_INTERVIEW_QUESTION_COUNT=5
```

You can generate `AUTH_SECRET` by running `npx auth secret`.

Create the tables and load the subscription plans:

```bash
npm run db:push
node scripts/initAdminTables.js
node scripts/initSubscriptionPlans.js
```

Start the dev server:

```bash
npm run dev
```

Then open http://localhost:3000.

To make an account an admin, sign up with it first and then run:

```bash
node scripts/makeUserAdmin.js you@example.com
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Build for production |
| `npm start` | Run the production build |
| `npm run lint` | Run the linter |
| `npm run db:push` | Push the Drizzle schema to the database |
| `npm run db:studio` | Open Drizzle Studio |

## Project structure

```
app/
  admin/          Admin panel
  api/            API routes for interviews, auth, payments and admin
  dashboard/      Interviews, copilot, history, profile and upgrade pages
components/ui/    Shared UI components
drizzle/          SQL migrations
scripts/          Database setup scripts
utils/            Database schema, AI clients, Stripe and subscription helpers
```

## Deployment

The app is ready to deploy on Vercel. Add the same environment variables in your Vercel project settings, and point your Stripe webhook to `/api/subscriptions/webhook`.

## License

MIT. See [LICENSE](LICENSE).
