/**
 * Autonomous agent orchestrator.
 *
 * Three public jobs:
 *   1. runDailyPost()      — generate + publish ONE daily post (if allowed)
 *   2. runAutoReplies()    — draft + publish replies for new 4★/5★ reviews
 *   3. runDailyCycle()     — wrapper that runs both, intended for cron
 *
 * Every action:
 *   - Passes through policyGuard before publishing
 *   - Is recorded in auditLog
 *   - Is idempotent (checks GBP itself to avoid double-posts)
 *   - Respects AUTOPILOT_ENABLED env var (kill-switch)
 *   - Respects AUTOPILOT_POST_DRY_RUN / AUTOPILOT_REPLY_DRY_RUN for testing
 *
 * These jobs NEVER throw to callers — they return a structured report
 * describing what they did or why they skipped.
 */

import gbpClient from './gbpClient.js';
import { generateText } from './geminiClient.js';
import { getTopicForToday, CLINIC } from './contentStrategy.js';
import { validatePost, validateReviewReply, isSafeForAutoReply } from './policyGuard.js';
import * as auditLog from './auditLog.js';
import { normalizePosts, normalizeReviews } from './normalizeGBPResponse.js';
import logger from './logger.js';

const processStartTime = Date.now();

/* ------------------------------------------------------------------ */
/* Env / feature flags                                                */
/* ------------------------------------------------------------------ */

function isEnabled() {
    // Default ON once deployed — but the kill switch is explicit OFF via env.
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

const ATTEMPTS_PER_DAY = 3;   // regenerate up to 3 times if policyGuard rejects
const LANGUAGE = 'en';

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function postWindowStart() {
    return Date.now() - postIntervalHours() * 60 * 60 * 1000;
}

/**
 * Query GBP for posts and report whether any LIVE post was published today
 * (current UTC calendar date). This is the authoritative idempotency check —
 * more trustworthy than the local audit log.
 */
async function alreadyPostedToday() {
    const todayUtc = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
    const raw = await gbpClient.getPosts();
    if (raw && raw.error) {
        // On API failure fall back to the local audit log.
        const logged = auditLog.findLast('autopilot.post.published');
        return !!(logged && logged.ts.slice(0, 10) === todayUtc);
    }
    const { posts } = normalizePosts(raw);
    return posts.some(p => p.createTime &&
        p.createTime.slice(0, 10) === todayUtc &&
        p.state !== 'REJECTED');
}

// rawProfile is the raw GBP API response (has .websiteUri directly).
function buildCallToAction(topic, rawProfile) {
    if (!topic.callToAction) return null;
    const { actionType, useWebsite } = topic.callToAction;
    if (actionType === 'CALL') {
        return { actionType: 'CALL' };
    }
    const url = useWebsite
        ? (rawProfile?.websiteUri || CLINIC.website)
        : CLINIC.website;
    if (!url) return null;
    return { actionType, url };
}

/* ------------------------------------------------------------------ */
/* Job 1 — Daily post                                                 */
/* ------------------------------------------------------------------ */

async function runDailyPost({ force = false, dryRun = null } = {}) {
    const report = { job: 'daily_post', skipped: false, reasons: [], attempts: [] };

    if (!isEnabled()) {
        report.skipped = true;
        report.reasons.push('autopilot_disabled');
        auditLog.record('autopilot.post.skipped', report);
        return report;
    }
    if (!dailyPostEnabled()) {
        report.skipped = true;
        report.reasons.push('daily_post_disabled');
        auditLog.record('autopilot.post.skipped', report);
        return report;
    }

    // Idempotency
    if (!force) {
        try {
            if (await alreadyPostedToday()) {
                report.skipped = true;
                report.reasons.push('already_posted_recently');
                auditLog.record('autopilot.post.skipped', report);
                return report;
            }
        } catch (e) {
            logger.error('alreadyPostedToday check failed: ' + e.message);
        }
    }

    // Pick today's topic from the rotating schedule
    const topic = getTopicForToday();
    report.theme = topic.theme;
    report.dayName = topic.dayName;

    // Fetch current profile once — raw response used for CTA URL + grounding context.
    // We keep the raw GBP response (.websiteUri, .title, .categories) so both
    // buildCallToAction and buildDailyPostPrompt can access fields without re-nesting.
    let rawProfile = null;
    try {
        const profileData = await gbpClient.getProfile();
        if (profileData && !profileData.error) rawProfile = profileData;
    } catch (e) {
        logger.error('getProfile failed in runDailyPost: ' + e.message);
    }

    const prompt = buildDailyPostPrompt(topic, rawProfile);

    // Generate + validate; retry with stricter instruction if policyGuard rejects
    let drafted = null;
    let validation = null;
    for (let i = 0; i < ATTEMPTS_PER_DAY; i++) {
        const attempt = { n: i + 1 };
        try {
            drafted = await generateText(
                i === 0
                    ? prompt
                    : prompt + `\n\nIMPORTANT: your previous draft was rejected (${(validation?.reasons || []).join(',')}). ` +
                      `Rewrite in plain English, 3–5 short sentences, no hashtags, no emojis, no foreign URLs, no phone numbers.`,
                { temperature: 0.6 + i * 0.1, maxOutputTokens: 400 }
            );
        } catch (err) {
            attempt.error = err.message;
            report.attempts.push(attempt);
            continue;
        }
        validation = validatePost(drafted);
        attempt.textPreview = drafted.slice(0, 120);
        attempt.ok = validation.ok;
        if (!validation.ok) attempt.reasons = validation.reasons;
        report.attempts.push(attempt);
        if (validation.ok) break;
    }

    if (!validation || !validation.ok) {
        report.skipped = true;
        report.reasons.push('all_drafts_failed_policy');
        auditLog.record('autopilot.post.rejected', report);
        return report;
    }

    // Build GBP payload
    const callToAction = buildCallToAction(topic, rawProfile);
    const payload = {
        languageCode: LANGUAGE,
        summary: validation.cleaned,
        topicType: topic.topicType,
    };
    if (callToAction) payload.callToAction = callToAction;

    const isDryRun = dryRun !== null ? dryRun : postDryRun();
    if (isDryRun) {
        report.dryRun = true;
        report.payload = payload;
        auditLog.record('autopilot.post.dry_run', report);
        return report;
    }

    // Publish
    const result = await gbpClient.createPost(payload);
    if (result && result.error) {
        report.error = result;
        auditLog.record('autopilot.post.error', report);
        return report;
    }

    report.published = true;
    report.postName = result?.name || null;
    report.summary = validation.cleaned;
    auditLog.record('autopilot.post.published', report);
    return report;
}

// rawProfile is the raw GBP API response: .title, .categories.primaryCategory.displayName, etc.
function buildDailyPostPrompt(topic, rawProfile) {
    const titleBits = [];
    if (rawProfile?.title) titleBits.push(`Clinic name: ${rawProfile.title}`);
    titleBits.push(`Location: Entebbe, Uganda`);
    if (rawProfile?.categories?.primaryCategory?.displayName) {
        titleBits.push(`Category: ${rawProfile.categories.primaryCategory.displayName}`);
    }
    return [
        `You are drafting a Google Business Profile "local post" for a healthcare clinic.`,
        titleBits.join('\n'),
        '',
        `TASK:\n${topic.prompt}`,
        '',
        `HARD CONSTRAINTS (non-negotiable):`,
        `- Output ONLY the post body — no title, no "here is the post" preamble, no quotation marks.`,
        `- 40–1400 characters.`,
        `- No hashtags, no emojis, no all-caps words longer than 3 letters.`,
        `- No phone numbers, no email addresses, no URLs in the body.`,
        `- No medical claims: do not use cure, guarantee, miracle, best, #1, diagnose, prescription, dosage.`,
        `- Plain conversational English only. No bullet points, no markdown.`,
    ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Job 2 — Auto-reply to safe reviews                                  */
/* ------------------------------------------------------------------ */

async function runAutoReplies({ maxReplies = 5, dryRun = null } = {}) {
    const report = { job: 'auto_replies', skipped: false, reasons: [], candidates: [] };

    if (!isEnabled()) {
        report.skipped = true;
        report.reasons.push('autopilot_disabled');
        auditLog.record('autopilot.reply.skipped', report);
        return report;
    }
    if (!autoRepliesEnabled()) {
        report.skipped = true;
        report.reasons.push('auto_replies_disabled');
        auditLog.record('autopilot.reply.skipped', report);
        return report;
    }

    const raw = await gbpClient.fetchReviews();
    if (raw && raw.error) {
        report.error = raw;
        auditLog.record('autopilot.reply.error', report);
        return report;
    }
    const { reviews = [] } = normalizeReviews(raw);

    // Safe candidates, newest first, up to maxReplies
    const candidates = reviews
        .filter(r => {
            const safe = isSafeForAutoReply(r);
            return safe.ok;
        })
        .sort((a, b) => Date.parse(b.createTime || 0) - Date.parse(a.createTime || 0))
        .slice(0, maxReplies);

    const flaggedForHuman = reviews
        .filter(r => !r.hasReply && !isSafeForAutoReply(r).ok)
        .slice(0, 20)
        .map(r => ({
            reviewName: r.reviewName,
            reviewer: r.reviewer,
            starRating: r.starRating,
            createTime: r.createTime,
            reasons: isSafeForAutoReply(r).reasons,
        }));

    report.flaggedForHuman = flaggedForHuman;

    for (const review of candidates) {
        const entry = {
            reviewName: review.reviewName,
            reviewer: review.reviewer,
            starRating: review.starRating,
            attempts: [],
        };
        let drafted, validation;
        for (let i = 0; i < ATTEMPTS_PER_DAY; i++) {
            const prompt = buildReplyPrompt(review, i, validation?.reasons);
            try {
                drafted = await generateText(prompt, { temperature: 0.5, maxOutputTokens: 220 });
            } catch (err) {
                entry.attempts.push({ n: i + 1, error: err.message });
                continue;
            }
            validation = validateReviewReply(drafted, review);
            entry.attempts.push({
                n: i + 1,
                ok: validation.ok,
                reasons: validation.ok ? undefined : validation.reasons,
                preview: drafted.slice(0, 140),
            });
            if (validation.ok) break;
        }

        if (!validation || !validation.ok) {
            entry.skipped = true;
            entry.reasons = ['all_drafts_failed_policy'];
            auditLog.record('autopilot.reply.rejected', entry);
            report.candidates.push(entry);
            continue;
        }

        const isReplyDryRun = dryRun !== null ? dryRun : replyDryRun();
        if (isReplyDryRun) {
            entry.dryRun = true;
            entry.draft = validation.cleaned;
            auditLog.record('autopilot.reply.dry_run', entry);
            report.candidates.push(entry);
            continue;
        }

        const resp = await gbpClient.replyToReview(review.reviewName, validation.cleaned);
        if (resp && resp.error) {
            entry.error = resp;
            auditLog.record('autopilot.reply.error', entry);
        } else {
            entry.published = true;
            entry.reply = validation.cleaned;
            auditLog.record('autopilot.reply.published', entry);
        }
        report.candidates.push(entry);
    }

    return report;
}

function buildReplyPrompt(review, attempt, lastReasons) {
    const stars = review.starRating;
    const comment = (review.comment || '').slice(0, 500);
    const correction = attempt > 0
        ? `\n\nYour previous draft was rejected (${(lastReasons || []).join(',')}). Rewrite plainly, no links, no phone numbers, no quotes of the reviewer.`
        : '';
    return [
        `You are the owner of ${CLINIC.name} in ${CLINIC.city}, ${CLINIC.country}.`,
        `Write a short, warm, personal reply (2–4 sentences) to the following Google review.`,
        `Star rating: ${stars}`,
        comment ? `Review text: "${comment}"` : `(The reviewer left no text comment.)`,
        ``,
        `HARD CONSTRAINTS (non-negotiable):`,
        `- Thank the reviewer sincerely. Use the reviewer's first name only if it is clearly present in review metadata; otherwise say "Thank you".`,
        `- Do NOT quote the reviewer's text back at them.`,
        `- Do NOT mention any specific diagnosis, treatment, or medical outcome.`,
        `- Do NOT include URLs, phone numbers, or email addresses.`,
        `- No hashtags, no emojis, no all-caps words.`,
        `- Do not use "cure", "guarantee", "miracle", "best".`,
        `- Output ONLY the reply text. No preamble, no quotation marks, no sign-off line breaks.`,
        correction,
    ].join('\n');
}

/* ------------------------------------------------------------------ */
/* Job 3 — Daily cycle (used by cron)                                  */
/* ------------------------------------------------------------------ */

async function runDailyCycle(options = {}) {
    const started = Date.now();
    auditLog.record('autopilot.cycle.started', { source: options.source || 'manual' });

    const postReport = dailyPostEnabled()
        ? await runDailyPost(options).catch(e => ({ job: 'daily_post', error: e.message }))
        : { job: 'daily_post', skipped: true, reasons: ['disabled'] };

    const replyReport = autoRepliesEnabled()
        ? await runAutoReplies(options).catch(e => ({ job: 'auto_replies', error: e.message }))
        : { job: 'auto_replies', skipped: true, reasons: ['disabled'] };

    const summary = {
        durationMs: Date.now() - started,
        enabled: isEnabled(),
        postReport,
        replyReport,
    };
    auditLog.record('autopilot.cycle.finished', summary);
    return summary;
}

/* ------------------------------------------------------------------ */
/* Status snapshot                                                     */
/* ------------------------------------------------------------------ */

async function getStatus() {
    let postedToday = null;
    try { postedToday = await alreadyPostedToday(); }
    catch { postedToday = null; }

    const uptimeSecs = Math.floor((Date.now() - processStartTime) / 1000);
    const uptimeStr = uptimeSecs < 60
        ? `${uptimeSecs}s`
        : uptimeSecs < 3600
            ? `${Math.floor(uptimeSecs / 60)}m`
            : `${Math.floor(uptimeSecs / 3600)}h ${Math.floor((uptimeSecs % 3600) / 60)}m`;

    return {
        enabled: isEnabled(),
        uptime: uptimeStr,
        dailyPost: {
            enabled: dailyPostEnabled(),
            dryRun: postDryRun(),
            postedToday,
            todaysTheme: getTopicForToday(),
            lastRun: auditLog.findLast('autopilot.post.published'),
            lastRejection: auditLog.findLast('autopilot.post.rejected'),
        },
        autoReplies: {
            enabled: autoRepliesEnabled(),
            dryRun: replyDryRun(),
            lastRun: auditLog.findLast('autopilot.reply.published'),
        },
        lastCycle: auditLog.findLast('autopilot.cycle.finished'),
        recentEvents: auditLog.recent(50, 'autopilot.'),
    };
}

export {
    runDailyPost,
    runAutoReplies,
    runDailyCycle,
    getStatus,
};
