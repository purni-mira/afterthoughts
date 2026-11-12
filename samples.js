/* Afterthoughts — sample library so a first-time visitor sees a full dashboard.
 * Every sample is marked sample:true and can be removed in one tap. */
(function (AT) {
  "use strict";
  const DAY = 86400000;

  const RAW = [
    {
      title: "Remote work and early careers",
      tags: ["work", "careers"],
      lens: "india",
      ago: 2,
      status: "posted",
      source: "A new survey of Indian tech firms says employees in their first two years learn slower when fully remote, because they miss informal mentoring, overheard conversations and quick feedback from seniors.",
      gist: "Fully remote work slows learning for early-career employees because they miss informal mentoring.",
      qa: [
        ["React", "What part of this did you instantly agree or disagree with?", "I agreed with the mentoring part. In my internship I learnt more from lunch conversations than from any training deck."],
        ["Evaluate", "Is it remote work itself, or how teams run remote work?", "Honestly it's how teams run it. My manager at my last internship did daily 10 minute calls and I never felt lost."],
        ["Connect", "How does this look for a fresher in a tier-2 city?", "For someone in Rohtak or Indore remote might be the only way into a good company, so killing it would hurt them more than slow learning does."],
        ["Challenge", "A critic would say good managers are rare, so offices are the safer default. How do you answer?", "Then fix the managers. Forcing everyone into an office to cover for bad managers is lazy."],
        ["Commit", "In one sentence, what do you believe now?", "Remote work doesn't slow freshers down, managers who don't mentor do."],
      ],
      stance: "Remote work doesn't slow freshers down; managers who don't mentor do.",
      points: ["My manager's daily 10 minute calls meant I never felt lost while remote.", "For freshers in tier-2 cities, remote may be the only door into a good company.", "Forcing everyone into offices to cover for bad managers is lazy."],
      draft: "Remote work doesn't slow freshers down. Managers who don't mentor do.\n\nIn my internship I learnt more from lunch conversations than from any training deck. But when I worked remotely, my manager did daily 10 minute calls and I never felt lost.\n\nFor someone in Rohtak or Indore, remote might be the only way into a good company.\n\nSo before we drag everyone back to the office, let's fix the managers.\n\nWhere did you learn more in your first job?",
      originality: 46,
      depth: 86,
      confidence: 4,
    },
    {
      title: "AI and junior jobs",
      tags: ["ai", "jobs"],
      lens: "second",
      ago: 5,
      status: "drafted",
      source: "An essay argues AI coding tools will remove most junior developer roles within five years, since seniors with AI can do the work juniors used to do.",
      gist: "AI tools may remove junior developer roles because seniors with AI can do their work.",
      qa: [
        ["React", "What made you pause in this?", "The idea that companies will stop hiring juniors. Then where do future seniors come from?"],
        ["Evaluate", "Where does the argument hold, and where does it crack?", "It holds for routine tasks. It cracks because judgment comes from doing the boring work first."],
        ["Challenge", "Companies optimise for this quarter, not ten years out. Why would they train juniors?", "Some won't, and they'll pay more for seniors later. The ones that train juniors will win the talent game."],
        ["Commit", "What do you believe now?", "AI won't kill junior roles, it will change them from doing tasks to checking and directing AI."],
      ],
      stance: "AI won't kill junior roles; it will turn them from doing tasks into checking and directing AI.",
      points: ["Judgment comes from doing the boring work first, so firms still need a pipeline.", "Companies that stop training juniors will pay more for seniors later."],
      draft: "Everyone's asking if AI will kill junior jobs. I think we're asking the wrong question.\n\nIf companies stop hiring juniors, where do future seniors come from?\n\nJudgment comes from doing the boring work first. AI will change junior roles from doing tasks to checking and directing AI.\n\n[add your example]\n\nWhat would you want a junior to learn first?",
      originality: 38,
      depth: 72,
      confidence: 3,
    },
    {
      title: "Quick commerce habits",
      tags: ["consumer", "india"],
      lens: "people",
      ago: 9,
      status: "take",
      source: "Quick commerce apps now deliver groceries in ten minutes across Indian metros. Critics say it builds impulse buying and hurts neighbourhood kirana stores.",
      gist: "Ten-minute delivery may encourage impulse buying and hurt local kirana stores.",
      qa: [
        ["React", "What's your first reaction?", "I use it every week, so I felt a bit called out."],
        ["Connect", "Who wins and who loses if this spreads?", "Busy professionals win. Kirana owners lose unless they join these apps. Delivery riders carry the risk of the ten minute promise."],
        ["Commit", "Your one line?", "Quick commerce is a real convenience, but the ten minute promise is paid for by riders and kiranas."],
      ],
      stance: "Quick commerce is real convenience, but the ten-minute promise is paid for by riders and kiranas.",
      points: ["Busy professionals clearly win.", "Kirana owners lose unless they join the apps.", "Riders carry the risk of the ten minute promise."],
      depth: 54,
      confidence: 4,
    },
    {
      title: "Four-day work week",
      tags: ["work", "productivity"],
      lens: "devil",
      ago: 14,
      status: "parked",
      source: "A pilot in several companies found a four-day week kept output flat while improving wellbeing, but managers worried about client availability.",
      gist: "A four-day week pilot kept output steady and improved wellbeing, with client-availability concerns.",
      qa: [
        ["React", "What stood out?", "Output stayed flat. That surprised me."],
        ["Evaluate", "Is that because of the four days, or because people were being watched in a pilot?", "Probably both, I'm not sure yet."],
      ],
      depth: 31,
    },
    {
      title: "Degrees versus shipped work",
      tags: ["education", "careers"],
      lens: "balanced",
      ago: 21,
      status: "posted",
      source: "Recruiters increasingly say a portfolio of shipped projects can matter more than the college name, especially in product and design roles.",
      gist: "Shipped work may now outweigh the college name in product and design hiring.",
      qa: [
        ["React", "What did you think while reading this?", "This is exactly why I built a game and a portfolio site during my MBA."],
        ["Evaluate", "Is it true across roles?", "Not for consulting or finance yet, where the brand still opens doors. For product, yes."],
        ["Commit", "Your take?", "The degree opens the door, but what you've shipped decides if you stay in the room."],
      ],
      stance: "The degree opens the door, but what you've shipped decides if you stay in the room.",
      points: ["In consulting and finance the college brand still opens doors.", "For product roles, shipped work is what gets noticed."],
      draft: "The degree opens the door. What you've shipped decides if you stay in the room.\n\nThis is exactly why I built a game and a portfolio site during my MBA.\n\nIn consulting and finance the brand still opens doors. For product roles, shipped work is what gets noticed.\n\nWhat have you shipped this year?",
      originality: 52,
      depth: 63,
      confidence: 5,
    },
    {
      title: "Building in public",
      tags: ["startups", "founders"],
      lens: "future",
      ago: 33,
      status: "thinking",
      source: "Founders who share revenue numbers and lessons publicly attract customers and investors, but some say it turns building into performing.",
      gist: "Building in public attracts attention but can turn building into performing.",
      qa: [["React", "What's your gut reaction?", "I like it but I've seen people post more than they build."]],
      depth: 18,
    },
  ];

  AT.makeSamples = function () {
    const now = Date.now();
    return RAW.map((r, n) => {
      const created = now - r.ago * DAY - (n * 37 + 11) * 60000;
      const messages = [];
      r.qa.forEach((q, i) => {
        messages.push({ role: "ai", text: q[1], rung: q[0], at: created + i * 90000 });
        messages.push({ role: "me", text: q[2], at: created + i * 90000 + 60000 });
      });
      const s = {
        id: "sample-" + (n + 1),
        sample: true,
        createdAt: created,
        updatedAt: created + 20 * 60000,
        status: r.status,
        stage: r.status === "thinking" || r.status === "parked" ? (r.stance ? "take" : "unpack") : r.draft ? "express" : "take",
        title: r.title,
        gist: r.gist,
        tags: r.tags,
        lens: r.lens,
        depth: "standard",
        source: { type: "text", text: r.source },
        messages,
        take: r.stance ? { stance: r.stance, points: r.points || [], confidence: r.confidence || 3 } : null,
        drafts: r.draft ? [{ id: "d" + n, format: "linkedin", length: "short", tone: "voice", body: r.draft, at: created + 30 * 60000 }] : [],
        posted: r.status === "posted" ? { at: created + DAY / 2, url: "" } : null,
        scores: { depth: r.depth || 0, originality: r.originality },
        activity: [created + DAY * 1.2, created + DAY * 3.1].filter((t) => t < now && n % 2 === 0),
      };
      return s;
    }).concat(
      // extra lightweight history so the heatmap looks lived-in
      Array.from({ length: 9 }, (_, i) => ({
        id: "sample-h" + i,
        sample: true,
        createdAt: now - (40 + i * 6) * DAY,
        updatedAt: now - (40 + i * 6) * DAY,
        status: i % 3 === 0 ? "posted" : "take",
        stage: "take",
        title: ["UPI and trust", "Hustle culture", "Internships", "MBA and coding", "Personal brands", "Startups vs big companies", "Reading summaries", "Social media as a CV", "Exam culture"][i],
        gist: "",
        tags: [],
        lens: "balanced",
        depth: "quick",
        source: { type: "idea", text: "" },
        messages: [],
        take: { stance: ["UPI made trust a product feature.", "Hustle culture didn't die, it moved to side projects.", "Unpaid internships filter for privilege, not talent.", "MBAs should learn to read code, not write it.", "A personal brand is just your work, made visible.", "Your first job should teach you speed, so pick the startup.", "Summaries make me feel informed, not think better.", "My GitHub says more than my CV.", "Exams reward recall; jobs reward judgment."][i], points: [], confidence: 3 },
        drafts: [],
        posted: i % 3 === 0 ? { at: now - (40 + i * 6) * DAY + DAY } : null,
        scores: { depth: 40 + ((i * 7) % 35) },
      }))
    );
  };
})(window.AT);
