import storage from './storage.js';
import logger from './logger.js';

// Official Google Business Profile format specifications.
// Used by policyGuard, autonomousAgent, and geminiClient as a single source of truth.
export const GBP_FORMAT = {
    POST_MAX: 1500,           // Google hard limit
    POST_SAFETY_MAX: 1400,    // Our enforced ceiling (100-char safety margin)
    POST_OPTIMAL_MIN: 150,    // Google engagement sweet spot — lower bound
    POST_OPTIMAL_MAX: 300,    // Google engagement sweet spot — upper bound
    REPLY_MAX: 4000,
    REPLY_OPTIMAL_MAX: 600,   // Warm and readable; longer replies lose attention
    DESCRIPTION_MAX: 750,
    DESCRIPTION_CRITICAL: 250, // First 250 chars shown in truncated search preview
    POST_EXPIRY_DAYS: 7,       // STANDARD posts expire after 7 days
    EVENT_TITLE_MAX: 58,
};

export const CLINIC = {
    name: 'Eritage ENT Care',
    city: 'Entebbe',
    country: 'Uganda',
    // phone, description, services are populated at runtime from the live GBP profile.
    // These empty defaults ensure the prompt builder never crashes if the API is down.
    phone: '',
    website: 'https://eritageentcare.com',
    primarySpecialty: 'Ear, Nose & Throat (ENT)',
    audience: 'adults and children in and around Entebbe and greater Kampala',
    tone: 'warm, professional, reassuring, plain-English',
    description: '',
    services: [],
};

const STRATEGY_FILE = 'synapse-strategy.json';

/**
 * Default weekly themes. Index matches JavaScript getDay() (Sunday = 0).
 */
const DEFAULT_WEEKLY_THEMES = [
    // Sunday — gentle awareness / community
    {
        theme: 'community_awareness',
        tagline: 'Everyday ENT awareness tip for your community',
        topicType: 'STANDARD',
        callToAction: { actionType: 'LEARN_MORE', useWebsite: true },
        prompt:
            'Write a short, warm community-awareness post for an ENT clinic in Entebbe, Uganda. ' +
            'Pick ONE everyday ENT topic (e.g. protecting hearing from loud music, staying hydrated to ease throat irritation, ' +
            'why you should never use cotton buds deep in the ear, seasonal allergy comfort tips, caring for your voice). ' +
            'Offer ONE practical tip and invite readers to book a professional check-up if symptoms persist. ' +
            'Avoid disease names, diagnoses, treatment claims, dosages, or medical guarantees. ' +
            'Do not use the words "cure", "treat", "guaranteed", or "best". ' +
            'Do not tell anyone to stop seeing another doctor. ' +
            'Keep it 3–5 short sentences, friendly and plain. No hashtags, no emojis.',
    },
    // Monday — "Meet the team" / clinic culture (no person-specific claims)
    {
        theme: 'clinic_culture',
        tagline: 'A look at the patient experience at Eritage ENT Care',
        topicType: 'STANDARD',
        callToAction: { actionType: 'LEARN_MORE', useWebsite: true },
        prompt:
            'Write a short, welcoming post about the patient experience at Eritage ENT Care in Entebbe, Uganda. ' +
            'Emphasise one of: a calm clinic environment, modern diagnostic equipment, child-friendly care, ' +
            'or careful listening during consultations. ' +
            'Speak in general terms about the clinic — do NOT mention individual staff names, photos, or credentials. ' +
            'Invite readers to schedule a consultation. ' +
            'No medical claims, no superlatives like "best" or "top". 3–5 short sentences. No hashtags, no emojis.',
    },
    // Tuesday — service spotlight (informational, not promotional/medical advice)
    {
        theme: 'service_spotlight',
        tagline: 'Spotlight on one of our ENT service categories',
        topicType: 'STANDARD',
        callToAction: { actionType: 'BOOK', useWebsite: true },
        prompt:
            'Write a brief informational post spotlighting ONE general ENT service category offered at Eritage ENT Care ' +
            '(e.g. hearing assessments, ear cleaning by a professional, nasal congestion consultations, sore-throat evaluations, ' +
            'paediatric ENT check-ups, snoring or sleep-breathing assessments). ' +
            'Describe who might benefit in plain language, without promising outcomes. ' +
            'Do not list prices. Do not compare to other clinics. No "cure", "treat", "guaranteed", "best". ' +
            'Invite readers to book an appointment. 3–5 short sentences. No hashtags, no emojis.',
    },
    // Wednesday — everyday ENT wellness tip
    {
        theme: 'wellness_tip',
        tagline: 'A practical wellness tip for ear, nose & throat health',
        topicType: 'STANDARD',
        callToAction: { actionType: 'LEARN_MORE', useWebsite: true },
        prompt:
            'Write a short, useful wellness tip related to ear, nose, or throat health for readers in Entebbe, Uganda. ' +
            'Example angles: safe ear hygiene, reducing screen-time-related throat strain, staying hydrated, ' +
            'how to protect your ears at loud events, when to rest your voice. ' +
            'Give ONE gentle, general tip and remind readers a professional check-up helps if symptoms last or worsen. ' +
            'Do not diagnose. Do not recommend specific medications, dosages, or home remedies. ' +
            'No "cure", "treat", "guaranteed", "best". 3–5 short sentences. No hashtags, no emojis.',
    },
    // Thursday — FAQ / "did you know" (educational, neutral)
    {
        theme: 'did_you_know',
        tagline: 'An interesting ENT fact your patients will appreciate',
        topicType: 'STANDARD',
        callToAction: { actionType: 'LEARN_MORE', useWebsite: true },
        prompt:
            'Write a short "did you know?" style post about a general, non-alarming ENT fact ' +
            '(e.g. the ear has three main parts, the nose warms air before it reaches the lungs, ' +
            'the tonsils are part of the immune system, balance is partly controlled by the inner ear). ' +
            'Keep it educational and curious, not promotional. ' +
            'Close with a friendly reminder that Eritage ENT Care in Entebbe is available for check-ups. ' +
            'No diagnoses, no treatment claims, no "cure"/"treat"/"guaranteed"/"best". ' +
            '3–5 short sentences. No hashtags, no emojis.',
    },
    // Friday — gentle seasonal/weekly reminder
    {
        theme: 'weekly_reminder',
        tagline: 'End-of-week reminder — new patients welcome this weekend',
        topicType: 'STANDARD',
        callToAction: { actionType: 'CALL', useWebsite: false },
        prompt:
            'Write a short, friendly end-of-week post reminding readers in Entebbe that Eritage ENT Care is open ' +
            'and welcoming new patients for ear, nose, and throat concerns. ' +
            'Encourage anyone who has been putting off a check-up to call and book. ' +
            'No medical claims. No specific conditions. No "cure"/"treat"/"guaranteed"/"best". ' +
            '2–4 short sentences. No hashtags, no emojis.',
    },
    // Saturday — weekend soft awareness (family/kids angle)
    {
        theme: 'family_wellness',
        tagline: 'Family ENT wellness — caring for children and adults',
        topicType: 'STANDARD',
        callToAction: { actionType: 'LEARN_MORE', useWebsite: true },
        prompt:
            'Write a short, warm post about family ENT wellness for weekend readers in Entebbe, Uganda. ' +
            'Pick ONE gentle angle: paediatric ear check-ups, kids and loud play, how the whole family can ease seasonal sniffles, ' +
            'or when to bring a child in for a persistent cough or earache. ' +
            'Encourage parents to book a consultation if they have concerns — avoid alarming language. ' +
            'No diagnoses, no treatment claims, no "cure"/"treat"/"guaranteed"/"best". ' +
            '3–5 short sentences. No hashtags, no emojis.',
    },
];

const DEFAULT_KNOWLEDGE_BASE = [
    'Eritage ENT Care is located in Entebbe, Uganda.',
    'The clinic specializes in Ear, Nose, and Throat (ENT) conditions for both adults and children.',
    'We offer hearing assessments, ear cleaning, and consultations for various ENT issues.',
    'The clinic provides modern diagnostic equipment in a calm and patient-friendly environment.',
];

let activeStrategy = null;

async function getStrategy() {
    if (activeStrategy) return activeStrategy;

    const loaded = await storage.load(STRATEGY_FILE);
    if (loaded) {
        activeStrategy = loaded;
    } else {
        activeStrategy = {
            weeklyThemes: DEFAULT_WEEKLY_THEMES,
            knowledgeBase: DEFAULT_KNOWLEDGE_BASE
        };
    }
    return activeStrategy;
}

export async function updateStrategy(newStrategy) {
    const success = await storage.save(STRATEGY_FILE, newStrategy);
    if (success) {
        activeStrategy = newStrategy;
        return { success: true };
    }
    return { success: false, error: 'FAILED_TO_SAVE' };
}

export async function getKnowledgeBase() {
    const strategy = await getStrategy();
    return strategy.knowledgeBase || DEFAULT_KNOWLEDGE_BASE;
}

/**
 * Absolute content constraints enforced later by policyGuard.js.
 */
export const CONTENT_CONSTRAINTS = {
    maxLength: GBP_FORMAT.POST_SAFETY_MAX,
    minLength: 80, // Posts under 80 chars are too thin for a meaningful ENT message
    bannedTerms: [
        'cure', 'cures', 'cured',
        'guarantee', 'guaranteed', 'guarantees',
        'miracle', 'miraculous',
        'best ent', 'number one', '#1',
        'prescription', 'dosage',
        'diagnose you', 'we diagnose',
    ],
    bannedTermsInReplies: [
        'cure', 'guarantee', 'miracle',
    ],
};

/**
 * Returns today's scheduled topic (weekly rotation).
 */
export async function getTopicForToday(now = new Date()) {
    const strategy = await getStrategy();
    const themes = strategy.weeklyThemes || DEFAULT_WEEKLY_THEMES;
    const idx = now.getDay();
    const topic = themes[idx];
    return { ...topic, dayIndex: idx, dayName: dayName(idx) };
}

/**
 * Returns the next N scheduled topics starting today.
 */
export async function getUpcomingTopics(days = 7, now = new Date()) {
    const out = [];
    for (let i = 0; i < days; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() + i);
        const topic = await getTopicForToday(d);
        out.push({ date: d.toISOString().slice(0, 10), ...topic });
    }
    return out;
}

function dayName(idx) {
    return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][idx];
}

export { getStrategy };

