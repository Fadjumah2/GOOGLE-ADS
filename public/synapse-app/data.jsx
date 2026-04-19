// Synapse Dashboard — mock data
const MOCK = {
  business: {
    name: "Eritage ENT Care",
    address: "Plot 14, Kampala Rd · Entebbe, Uganda",
    phone: "+256 700 123 456",
    website: "eritage-ent.com",
    hours: "Mon–Fri 08:00–18:00 · Sat 09:00–14:00",
    category: "ENT Clinic · Audiology",
    verified: true
  },
  metrics: [
    { label: "Profile views", value: "14.2k", delta: "+18%", spark: [12, 14, 11, 18, 16, 22, 19, 24, 21, 28, 32, 29, 34, 38] },
    { label: "Direction requests", value: "842", delta: "+24%", spark: [4, 5, 6, 4, 7, 8, 9, 11, 10, 12, 14, 15, 17, 19] },
    { label: "Calls", value: "318", delta: "+9%", spark: [8, 9, 7, 10, 11, 10, 12, 13, 11, 14, 13, 15, 14, 16] },
    { label: "Website clicks", value: "1,204", delta: "+32%", spark: [2, 3, 4, 3, 5, 6, 5, 7, 8, 9, 11, 12, 14, 16] }
  ],
  todayPost: {
    theme: "Patient education",
    status: "ready",
    scheduledAt: "09:00 EAT",
    preview: "Hearing changes often creep up gradually. If you've been turning up the TV or asking people to repeat themselves, a straightforward audiology check can clarify what's going on — no referral needed.",
    checks: [
      { k: "Policy", v: "clean", ok: true },
      { k: "Length", v: "242 / 1400", ok: true },
      { k: "Links", v: "0", ok: true },
      { k: "Medical claims", v: "none", ok: true }
    ]
  },
  calendar: [
    { day: "Mon", date: 14, theme: "Patient education", topic: "Hearing checks", done: true },
    { day: "Tue", date: 15, theme: "Services", topic: "Paediatric audiology", done: true },
    { day: "Wed", date: 16, theme: "Tips & FAQ", topic: "Ear wax removal", done: true },
    { day: "Thu", date: 17, theme: "Staff", topic: "Meet Dr. Namwase", done: true },
    { day: "Fri", date: 18, theme: "Seasonal", topic: "Allergy season", done: true },
    { day: "Sat", date: 19, theme: "Patient education", topic: "Hearing changes", today: true },
    { day: "Sun", date: 20, theme: "Hours", topic: "Weekend availability" }
  ],
  reviews: [
    { id: 1, name: "Patricia M.", initials: "PM", stars: 5, time: "2h", text: "Dr. Namwase was so patient with my daughter during her first ear check. The clinic is clean, modern, and the front desk team remembered us by name on the return visit.", status: "auto-replied", reply: "Thank you for the kind words, Patricia. We're glad the visit went smoothly — see you again." },
    { id: 2, name: "Robert K.", initials: "RK", stars: 5, time: "5h", text: "Short wait, clear explanations, and the audiology equipment is top-notch. I've recommended Eritage to two colleagues already.", status: "auto-replied", reply: "Thank you, Robert. We appreciate the referrals." },
    { id: 3, name: "Sarah N.", initials: "SN", stars: 4, time: "1d", text: "Good experience overall. Booking was easy and the consultation was thorough. Parking was a bit tight.", status: "drafted", draft: "Thank you for the feedback, Sarah. We're exploring additional parking options for our patients." },
    { id: 4, name: "Anonymous", initials: "A", stars: 2, time: "2d", text: "Billing was confusing and I felt rushed through my appointment. Will not be returning.", status: "flagged", reasons: ["Low rating", "Complaint"] },
    { id: 5, name: "Joseph T.", initials: "JT", stars: 5, time: "3d", text: "Genuinely the best ENT experience I've had in Entebbe.", status: "auto-replied", reply: "Thank you, Joseph. We're glad we could help." }
  ],
  posts: [
    { id: 1, date: "Apr 19", status: "live", text: "Hearing changes often creep up gradually. If you've been turning up the TV or asking people to repeat themselves…", views: 842, clicks: 34 },
    { id: 2, date: "Apr 18", status: "live", text: "Allergy season is here. If you're dealing with sinus pressure, congestion, or post-nasal drip that won't quit, we can help.", views: 1102, clicks: 52 },
    { id: 3, date: "Apr 17", status: "live", text: "Meet Dr. Namwase, our lead audiologist with 12 years of experience specialising in paediatric hearing assessments.", views: 724, clicks: 28 },
    { id: 4, date: "Apr 16", status: "live", text: "Ear wax buildup is more common than you'd think. Our in-office removal is gentle, quick, and doesn't require a referral.", views: 988, clicks: 41 }
  ],
  auditLog: [
    { ts: "09:00:14", type: "post.publish", status: "ok", msg: "Daily post published · theme: patient education · 242 chars" },
    { ts: "09:00:12", type: "policy.check", status: "ok", msg: "Draft passed all 14 policy rules" },
    { ts: "09:00:08", type: "post.generate", status: "ok", msg: "Generated draft via gemini-1.5-pro (attempt 1/3)" },
    { ts: "09:00:02", type: "cron.start", status: "info", msg: "Daily cycle triggered by Vercel Cron" },
    { ts: "08:42:31", type: "review.reply", status: "ok", msg: "Auto-replied to 5★ review from Patricia M." },
    { ts: "08:42:28", type: "review.reply", status: "ok", msg: "Auto-replied to 5★ review from Robert K." },
    { ts: "08:42:24", type: "review.skip", status: "warn", msg: "Skipped 2★ review — flagged for human review" },
    { ts: "08:30:00", type: "insights.fetch", status: "ok", msg: "Fetched 28-day insights · 14.2k views (+18%)" }
  ],
  services: [
    { name: "Audiology consultation", price: "UGX 80k", duration: "45 min" },
    { name: "Ear wax removal", price: "UGX 45k", duration: "20 min" },
    { name: "Paediatric hearing test", price: "UGX 90k", duration: "60 min" },
    { name: "Tinnitus assessment", price: "UGX 120k", duration: "75 min" },
    { name: "Sinus consultation", price: "UGX 85k", duration: "45 min" },
    { name: "Allergy testing", price: "UGX 150k", duration: "90 min" }
  ],
  chatLog: [
    { role: "user", text: "How many 5-star reviews came in this month?" },
    { role: "agent", text: "14 five-star reviews this month — up 27% from March. 12 have been auto-replied; 2 are drafted and waiting on your approval.", tools: ["fetchReviews", "getInsights"] },
    { role: "user", text: "Draft a post about our new paediatric audiology service." },
    { role: "agent", text: "Drafted. 218 characters, policy-clean. Scheduled for 09:00 tomorrow — want me to post now instead?", tools: ["createPost", "policyGuard"], attachment: "Introducing paediatric audiology at Eritage — comprehensive hearing assessments for children ages 3 and up. Our child-friendly exam rooms and specialised equipment make it easy." }
  ]
};

window.MOCK = MOCK;
