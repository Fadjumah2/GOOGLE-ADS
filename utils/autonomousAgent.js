/**
 * Autonomous agent orchestrator.
 */

import * as gbpClient from './gbpClient.js';
import { generateText } from './geminiClient.js';
import { getTopicForToday, CLINIC, getKnowledgeBase } from './contentStrategy.js';
import { validatePost, validateReviewReply, isSafeForAutoReply } from './policyGuard.js';
import * as auditLog from './auditLog.js';
import { normalizePosts, normalizeReviews, normalizeServices, normalizeProfile } from './normalizeGBPResponse.js';
import storage from './storage.js';
import logger from './logger.js';

const processStartTime = Date.now();
const DRAFTS_FILE = 'synapse-drafts.json';
const LOCK_FILE = 'synapse-agent.lock';
const LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const LANGUAGE = 'en';
const ATTEMPTS_PER_DAY = 3;

/* ------------------------------------------------------------------ */
/* Clinic context — fetched once per job run                           */
/* ------------------------------------------------------------------ */

function formatHours(regularHours) {
    if (!regularHours?.periods?.length) return null;
    const abbr = { MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu', FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun' };
    const fmt = t => {
        const [h, m] = (t || '00:00').split(':');
        const hr = parseInt(h, 10);
        return `${hr > 12 ? hr - 12 : hr || 12}${m && m !== '00' ? ':' + m : ''}${hr >= 12 ? 'pm' : 'am'}`;
    };
    return regularHours.periods
        .map(p => `${abbr[p.openDay] || p.openDay} ${fmt(p.openTime)}–${fmt(p.closeTime)}`)
        .join(', ')
        .slice(0, 120);
}

async function fetchClinicContext() {
    const [profileRes, servicesRes] = await Promise.allSettled([
        gbpClient.getProfile(),
        gbpClient.getServiceList(),
    ]);
    const rawProfile = (profileRes.status === 'fulfilled' && !profileRes.value?.error)
        ? profileRes.value : null;
    let services = [];
    if (servicesRes.status === 'fulfilled' && !servicesRes.value?.error) {
        const { services: list } = normalizeServices(servicesRes.value);
        services = list.map(s => s.displayName).filter(Boolean).slice(0, 12);
    }
    return { rawProfile, services };
}

/* ------------------------------------------------------------------ */
/* Env / feature flags                                                */
/* ------------------------------------------------------------------ */

function isEnabled() {
    return (process.env.AUTOPILOT_ENABLED || 'true').toLowerCase() !== 'false';
}
function postDryRun() {
    return (process.env.AUTOPILOT_POST_DRY_RUN || 'false').toLowerCase() === 'true';
}
function replyDryRun() {
    return (process.env.AUTOPILOT_REPLY_DRY_RUN || 'false').toLowerCase() === 'true';
}
function autoRepliesEnabled() {
    return (process.env.AUTOPILOT_AUTO_REPLY || 'true').toLowerCase() !== 'false';
}
function dailyPostEnabled() {
    return (process.env.AUTOPILOT_DAILY_POST || 'true').toLowerCase() !== 'false';
}
function postIntervalHours() {
    const h = parseInt(process.env.POST_INTERVAL_HOURS || '48', 10);
    return isNaN(h) || h < 1 ? 48 : h;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

async function acquireLock() {
    const lock = await storage.load(LOCK_FILE);
    const now = Date.now();
    if (lock && (now - Date.parse(lock.ts)) < LOCK_TIMEOUT_MS) {
        return false;
    }
    await storage.save(LOCK_FILE, { ts: new Date().toISOString() });
    return true;
}

async function releaseLock() {
    await storage.save(LOCK_FILE, { ts: new Date(0).toISOString() });
}

async function cleanupOldDrafts() {
    const drafts = await getDrafts();
    const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const filtered = drafts.filter(d => Date.parse(d.ts) > weekAgo);
    if (filtered.length !== drafts.length) {
        await saveDrafts(filtered);
    }
}

async function getDrafts() {
    const drafts = await storage.load(DRAFTS_FILE);
    return drafts || [];
}

async function saveDrafts(drafts) {
    return await storage.save(DRAFTS_FILE, drafts);
}

async function addDraft(draft) {
    const drafts = await getDrafts();
    const newDraft = {
        id: Math.random().toString(36).slice(2, 11),
        ts: new Date().toISOString(),
        ...draft
    };
    drafts.push(newDraft);
    await saveDrafts(drafts);
    return newDraft;
}

async function alreadyPostedToday() {
    const todayUtc = new Date().toISOString().slice(0, 10);
    const raw = await gbpClient.getPosts();
    if (raw && raw.error) {
        const logged = auditLog.findLast('autopilot.post.published');
        return !!(logged && logged.ts.slice(0, 10) === todayUtc);
    }
    const { posts } = normalizePosts(raw);
    return posts.some(p => p.createTime && p.createTime.slice(0, 10) === todayUtc && p.state !== 'REJECTED');
}

function buildCallToAction(topic, rawProfile) {
    if (!topic.callToAction) return null;
    const { actionType, useWebsite } = topic.callToAction;
    if (actionType === 'CALL') return { actionType: 'CALL' };
    const url = useWebsite ? (rawProfile?.websiteUri || CLINIC.website) : CLINIC.website;
    if (!url) return null;
    return { actionType, url };
}

/* ------------------------------------------------------------------ */
/* Job 1 — Daily post                                                 */
/* ------------------------------------------------------------------ */

async function runDailyPost({ force = false, dryRun = null } = {}) {
    const report = { job: 'daily_post', skipped: false, reasons: [], attempts: [] };

    if (!isEnabled() || !dailyPostEnabled()) {
        report.skipped = true;
        report.reasons.push('disabled');
        return report;
    }

    if (!force && await alreadyPostedToday()) {
        report.skipped = true;
        report.reasons.push('already_posted');
        return report;
    }

    const topic = await getTopicForToday();
    report.theme = topic.theme;
    report.dayName = topic.dayName;

    const { rawProfile, services } = await fetchClinicContext();
    const knowledgeBase = await getKnowledgeBase();
    const prompt = buildDailyPostPrompt(topic, rawProfile, services, knowledgeBase);

    let drafted = null;
    let validation = null;
    for (let i = 0; i < ATTEMPTS_PER_DAY; i++) {
        try {
            drafted = await generateText(
                i === 0 ? prompt : prompt + `\n\nPrevious draft rejected: ${validation?.reasons?.join(', ')}. Rewrite plainly.`,
                { temperature: 0.6 + i * 0.1 }
            );
            validation = validatePost(drafted);
            if (validation.ok) break;
        } catch (err) {
            report.attempts.push({ n: i + 1, error: err.message });
        }
    }

    if (!validation?.ok) {
        report.skipped = true;
        report.reasons.push('all_attempts_failed');
        auditLog.record('autopilot.post.rejected', report);
        return report;
    }

    const payload = {
        languageCode: LANGUAGE,
        summary: validation.cleaned,
        topicType: topic.topicType,
        callToAction: buildCallToAction(topic, rawProfile)
    };

    if (dryRun || postDryRun()) {
        report.dryRun = true;
        report.payload = payload;
        auditLog.record('autopilot.post.dry_run', report);
        return report;
    }

    const draft = await addDraft({ payload, theme: topic.theme });
    report.drafted = true;
    report.draftId = draft.id;
    auditLog.record('autopilot.post.drafted', report);
    return report;
}

function buildDailyPostPrompt(topic, rawProfile, services = [], knowledgeBase = []) {
    const name = rawProfile?.title || CLINIC.name;
    const address = rawProfile?.storefrontAddress?.addressLines?.[0] || CLINIC.city;
    
    const kbSection = knowledgeBase.length > 0
        ? `\nCUSTOM CLINIC FACTS:\n- ${knowledgeBase.join('\n- ')}`
        : '';

    return [
        `You are drafting a Google post for ${name} in ${address}, Uganda.`,
        kbSection,
        `Services: ${services.join(', ') || 'ENT Care'}`,
        `TASK: ${topic.prompt}`,
        `RULES: No hashtags, no emojis, no medical claims, no phone numbers. 150-300 chars.`
    ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Job 2 — Auto-reply                                                 */
/* ------------------------------------------------------------------ */

async function runAutoReplies({ maxReplies = 5, dryRun = null } = {}) {
    const report = { job: 'auto_replies', skipped: false, reasons: [], candidates: [] };
    if (!isEnabled() || !autoRepliesEnabled()) return report;

    const { rawProfile } = await fetchClinicContext();
    const knowledgeBase = await getKnowledgeBase();
    const raw = await gbpClient.fetchReviews();
    const { reviews = [] } = normalizeReviews(raw);

    const candidates = reviews
        .filter(r => isSafeForAutoReply(r).ok)
        .slice(0, maxReplies);

    for (const review of candidates) {
        const prompt = buildReplyPrompt(review, 0, [], rawProfile, knowledgeBase);
        try {
            const drafted = await generateText(prompt);
            const validation = validateReviewReply(drafted, review);
            if (validation.ok) {
                if (dryRun || replyDryRun()) {
                    auditLog.record('autopilot.reply.dry_run', { review: review.reviewer, draft: validation.cleaned });
                } else {
                    await gbpClient.replyToReview(review.reviewName, validation.cleaned);
                    auditLog.record('autopilot.reply.published', { review: review.reviewer });
                }
            }
        } catch (e) { logger.error('Reply failed: ' + e.message); }
    }
    return report;
}

function buildReplyPrompt(review, attempt, lastReasons, rawProfile, knowledgeBase = []) {
    const name = rawProfile?.title || CLINIC.name;
    const kbSection = knowledgeBase.length > 0 ? `\nClinic facts: ${knowledgeBase.join('. ')}` : '';
    return `You are the owner of ${name}. ${kbSection}\nReply warmly to this ${review.starRating} review: "${review.comment || ''}"\nNo medical claims, no URLs, no quoting them.`;
}

async function runDailyCycle(options = {}) {
    if (!(await acquireLock())) return { success: false, error: 'LOCKED' };
    try {
        await cleanupOldDrafts();
        const postReport = await runDailyPost(options);
        const replyReport = await runAutoReplies(options);
        const summary = { postReport, replyReport, ts: new Date().toISOString() };
        auditLog.record('autopilot.cycle.finished', summary);
        return summary;
    } finally {
        await releaseLock();
    }
}

async function getStatus() {
    let postedToday = null;
    try { postedToday = await alreadyPostedToday(); } catch { postedToday = null; }
    
    const uptimeSecs = Math.floor((Date.now() - processStartTime) / 1000);
    const todaysTheme = await getTopicForToday();
    const drafts = await getDrafts();

    return {
        enabled: isEnabled(),
        uptime: `${Math.floor(uptimeSecs/60)}m`,
        dailyPost: {
            enabled: dailyPostEnabled(),
            postedToday,
            todaysTheme,
            draftsCount: drafts.length
        },
        autoReplies: { enabled: autoRepliesEnabled() },
        lastCycle: auditLog.findLast('autopilot.cycle.finished'),
    };
}

export { runDailyPost, runAutoReplies, runDailyCycle, getStatus, getDrafts, addDraft, saveDrafts };
