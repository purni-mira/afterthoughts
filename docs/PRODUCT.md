# Afterthoughts — product brief

**One line:** Bring what you read. Leave with what you think, and a post that sounds like you.

**Vision:** Help people become independent thinkers and confident voices. Don't let someone else's ideas be the only ideas you consume, and don't let your inability to write be the reason your own ideas stay unheard.

## The problem

People consume a lot (articles, LinkedIn posts, news, podcasts) and have reactions, but rarely develop them into a point of view. When they try to post, generic AI tools write *for* them, so everyone sounds the same. The result: lots of content, very little original thought.

## Two principles

1. **AI should enhance thinking, not replace it.** The app asks before it tells. It never drafts until the user has formed a take in their own words.
2. **AI should strengthen expression, not dilute individuality.** Drafts reuse the user's own phrases and match their measured voice. An originality meter makes that visible.

## Who it's for

| Segment | Pain | What they'd pay for | Priority |
| --- | --- | --- | --- |
| B-school students and early-career professionals in India (22–30) | Need a visible point of view for placements and personal brand; post rarely or post AI-sounding text | Regular posts that sound like them, with less effort | Launch |
| Founders and operators | Want thought leadership, no time to shape ideas | A fast path from reaction to polished post | Next |
| Writers and newsletter authors | Many half-formed ideas, few finished pieces | A library of developed takes | Later |
| Colleges and career services | Want students to build a credible online presence | A campus licence and guided programme | Later (B2B) |

## The core loop

Capture → Unpack → Take → Express. A session without a clear take is parked in the Thought Library and reopened later.

**What makes it different from asking ChatGPT:**
- Structure: a question ladder (React, Evaluate, Connect, Challenge, Commit), thinking lenses, push back, other perspectives
- Measurement: depth score, clarity score, originality meter, Voice DNA, thinking profile
- Memory: a library of your takes, connections between them, streaks and a weekly reflection
- Restraint: it refuses to write until you've thought

## What's in v2

| Area | Features |
| --- | --- |
| Capture | Text, link (server can fetch article text), screenshot (AI vision), passing thought; 7 thinking lenses; 3 depths; daily provocation |
| Unpack | One question at a time; Push back; Go deeper; I'm not sure (contrasting options); Through other eyes (3 personas); voice answers; live depth score and ladder |
| Take | Stance + reasons from the user's own words; clarity check (score, flags, bias checks, sharpening questions that reopen the conversation); confidence; tags; park; quote-card image |
| Express | 6 formats, 2 lengths, 4 tones; hook lab; originality, readability, cliché, gap and em-dash checks; LinkedIn, thread and slide previews; versions; copy, Markdown, image; "I posted it" with link |
| Dashboard | KPIs, heatmap, streaks, funnel, thinking-profile radar with insight, lenses, themes, ideas waiting, recent takes, weekly AI reflection |
| Library | Full-text search, filters, tags, sorting by depth or originality, Markdown export |
| Voice | Writing samples, style quiz, measured Voice DNA, AI voice description, profile |
| Platform | Demo mode, Gemini, Claude, OpenAI, own server proxy; local-first storage; backup and import; PWA; light and dark; embed mode; single-file build |

## Monetisation (proposed)

| Plan | Price | Includes |
| --- | --- | --- |
| Free | ₹0 | 5 AI sessions a month, LinkedIn format, basic voice |
| Pro | ₹299/month or ₹2,499/year | Unlimited sessions, all formats, Voice DNA, hook lab, full library and weekly reflection |
| Campus | Per-student licence | Pro for a batch plus a placement-season "build your voice" programme |

Unit cost (approximate; check current API prices): about 15,000 input and 3,000 output tokens per full session. Use a fast model for questions and a stronger one only for takes and drafts.

## Metrics

- **North star:** takes published per active user per week
- Activation: 60% of new users finish a first session with a take
- Session completion: 70% of started sessions reach a take
- Publish rate: 40% of takes are copied or marked posted
- Week-4 retention: 25% of activated users
- Free to paid: 3–5% within 60 days

## Biggest risks

| Risk | Mitigation |
| --- | --- |
| Users skip the thinking and want the post | Quick depth (3 questions), voice answers, visible originality and depth scores as rewards |
| "I can do this in ChatGPT" | The moat is structure, measurement and memory: profile, library, streaks, Voice DNA over time |
| Links can't be read in the browser | Server fetch, screenshot reading, paste |
| Drafts still sound generic | Voice samples, measured Voice DNA, cliché filter, reuse of the user's phrases |
| AI cost on free users | Monthly cap, fast model for questions, per-IP rate limit on the server |

## Validate first

Give the link to 10 classmates for one week. Build the paid tier only if at least 7 finish a session and 5 post something.
