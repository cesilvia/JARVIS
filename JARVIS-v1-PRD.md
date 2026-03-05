{\rtf1\ansi\ansicpg1252\cocoartf2867
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 # J.A.R.V.I.S. v1 PRD\
## Personal AI Operations Assistant\
*Created: January 29, 2026*\
\
## Product Vision\
J.A.R.V.I.S. is a personal AI operations assistant that helps me communicate, schedule, stay organized, and optimize training by drafting emails, managing tasks/calendar, and proactively adjusting plans around workouts, weather, and nutrition. Strong JARVIS personality: supportive, calm, competent, slightly witty\'97like Iron Man's JARVIS.\
\
## Primary Objective (v1)\
My life admin is organized: emails turn into tasks, schedules stay balanced around training, nutrition prep happens automatically.\
\
## Target Platforms\
Native apps: iPhone, iPad, Mac. Real-time notifications for approvals/nudges.\
\
## Integrations\
**Core (v1)**: Email, Fantastical (calendar), Things 3 (tasks), Craft (notes/docs).  \
**Fitness/Location (v1)**: TrainerRoad (calendar sync via .ics), Strava, Apple/Google Maps, AnyList, Weather (Fantastical/AccuWeather).\
\
## Key Features\
- **Task extraction/management**: Scan email/Craft \uc0\u8594  create/tag/reschedule tasks in Things 3. Opinionated organizer (move between lists, adjust due dates).\
- **Email drafting**: High-quality drafts from short prompts, tone control, always approval-required before sending.\
- **Workload awareness**: Calendar load (Fantastical) + energy tags (Things 3 High/Med/Low) \uc0\u8594  balanced scheduling.\
- **Training/nutrition planning**: Read TrainerRoad calendar \uc0\u8594  suggest prep/recovery nutrition tasks (carb/protein timing only).\
- **Proactive nudges**: Max 5/day, prioritized by impact. Real-time notifications with quick Approve/Edit/Decline.\
- **Weather awareness**: Adjust outdoor plans/errands based on forecasts.\
\
## Personality & Tone\
Strong JARVIS personality: calm, competent, supportive coach. Explains reasoning, offers optimizations, never nagging. Examples: "I've noticed three overdue tasks; shall I reschedule for tomorrow?" or "Heavy meeting day\'97want me to shift high-energy tasks?"\
\
## Safety & Constraints (Hard Rules)\
- Never send an email without explicit approval\
- Never delete or complete a task automatically\
- Never change workout plans without confirmation\
- Never schedule outside 9AM\'965PM work hours without explicit request\
- Never access/share sensitive data (passwords, financial info) from emails/Craft\
- Never change shared calendars/lists (AnyList, Fantastical invites) without extra confirmation\
- Low-confidence task detection \uc0\u8594  ask directly instead of proposing\
- Log all proposed changes for 14 days (audit trail)\
- Pause automations if offline >24hrs or traveling (Maps/Strava detection)\
- Max 5 proactive suggestions/day, prioritized by impact\
- Data isolation: Local/on-device processing; Convex syncs only anonymized metadata\
- API failure handling: Pause related suggestions + notify if integrations fail\
- Nutrition limits: General carb/protein timing only\'97no supplements/medical advice\
- Emergency override: "J.A.R.V.I.S., freeze" instantly pauses all automations\
\
## Technical Stack\
- **Frontend**: SwiftUI apps (iPhone/iPad/Mac) generated via Claude Code\
- **Backend**: Convex (real-time sync, task queues, integration polling)\
- **AI**: Claude models (drafting, extraction, nudges) via API + on-device where possible\
- **Integrations**: OAuth (email/Strava), .ics polling (TrainerRoad/Fantastical), Things 3/Craft via Shortcuts/API\
\
## MVP Build Plan (4 weeks)\
1. **Weeks 1-2**: Core task extraction (Email/Craft \uc0\u8594  Things 3) + approval UI\
2. **Week 3**: Email drafting + real-time notification UX\
3. **Week 4**: TrainerRoad calendar sync + nutrition nudges + weather awareness\
\
## Success Criteria (v1)\
- 80% of inbox emails auto-generate useful tasks I approve\
- Average daily nudges: 3-5, >70% approval rate\
- Nutrition prep tasks created for 90% of TrainerRoad workouts\
- Time saved: <10min/day on task/email admin (self-reported)\
- Zero safety violations in first 30 days\
\
## Risks & Dependencies\
- TrainerRoad calendar access (.ics export fallback if no API)\
- Things 3 integration depth (Shortcuts fallback if limited API)\
- Notification fatigue (monitor + easy opt-out)\
- Claude prompt reliability (iterative tuning needed)\
\
---\
\
# v1.1 Roadmap (Post-v1)\
## New Features\
| Feature | Description |\
|---------|-------------|\
| **Voice everywhere** | Voice commands/notifications ("J.A.R.V.I.S., draft reply") + live voice approvals |\
| **AnyList deep sync** | Bidirectional shopping list management + location-based suggestions |\
| **Advanced fitness** | Post-Strava analysis + Maps route suggestions + weather |\
| **Document smarts** | Craft doc summarization + action extraction |\
| **Weekly review** | Sunday insights on training load, task completion, nutrition adherence |\
\
## v1.1 Success Metrics\
- Voice commands handle 50% of interactions\
- AnyList/errands optimized for 80% of grocery runs\
- Weekly review gives actionable insights 90% of time\
- Overall time saved: <20min/day\
\
---\
\
*PRD Status: BUILD-READY. Copy to Craft/Notion. Use Claude Code for SwiftUI + Convex implementation.*\
}