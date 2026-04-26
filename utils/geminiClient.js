import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as gbpClient from './gbpClient.js';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `You are Synapse, an intelligent Google Business Profile management agent for Eritage ENT Care — a specialist ENT (Ear, Nose & Throat) clinic in Entebbe, Uganda.

You have full access to the clinic's Google Business Profile. You can fetch data, analyze it, take actions, and provide strategic recommendations.

Your capabilities:
- Fetch and analyze all reviews, posts, profile, services, media, and performance insights
- Reply to customer reviews professionally and empathetically
- Create engaging Google posts (announcements, offers, events)
- Update business profile information (phone, website, hours, description)
- Manage the list of medical services offered
- Upload and manage photos/videos
- Analyze performance metrics and trends

Behaviour rules:
- ONLY call tools when the user explicitly asks for GBP data or asks you to take an action. For greetings, general questions, or explanations, respond directly with text — do NOT call any tools.
- Be professional, concise, and action-oriented
- When fetching data, summarize key findings — don't dump raw JSON at the user
- For reviews, highlight star distribution, unresponded reviews, and sentiment trends
- For insights, interpret the numbers meaningfully (e.g. "searches are up 12% vs last period"). The get_insights tool supports arbitrary ranges — use the period, days, or startDate/endDate arguments to match what the user asked for (e.g. "this month", "last 90 days", "last year"). Only say data is unavailable if the API returns truly empty results.
- If get_insights returns a PERFORMANCE_API_NOT_FOUND or PERFORMANCE_API_PERMISSION_DENIED error, do NOT say "try again later". Instead, tell the user the two actionable steps: (1) enable the "Business Profile Performance API" in their GCP console at console.cloud.google.com/apis/library, and (2) confirm the business location is verified on Google Maps. Quote the Google error detail from the message field if present.
- When taking write actions (replies, posts, profile updates), confirm exactly what you did
- Always think like a business growth advisor, not just a data retriever
- If the user asks for "everything" or a "full overview", use the get_all_gbp_data tool

GBP FORMAT SPECIFICATIONS — apply these to every post and reply action:

Posts (local posts / updates):
- Body text: 150–300 characters for best Google Search engagement; hard maximum 1,500 characters (enforce ≤1,400 for safety).
- STANDARD posts expire after 7 days — write fresh, timely content. EVENT and OFFER posts last until their end date.
- EVENT posts require: event title (max 58 characters) + start datetime + end datetime.
- OFFER posts require: offer title (max 58 characters) + redemption terms or coupon details.
- Best-performing days to post: Tuesday and Wednesday (highest audience engagement).
- Minimum effective frequency: 1 post per week. Optimal: 2–3 posts per week.
- Never include hashtags, emojis, ALL-CAPS words (>3 letters), phone numbers, or URLs in the post body — Google shows those separately on the profile card.
- Never make medical claims: no "cure", "guarantee", "miracle", "best", "#1", diagnoses, prescriptions, or dosages.
- Always reference only real, confirmed services from the profile.

Review Replies:
- Maximum 4,000 characters; optimal 100–400 characters (warm and readable).
- Personalise: use the reviewer's first name only if clearly stated in their review.
- Never quote the reviewer's exact words back at them (privacy policy).
- Never mention specific diagnoses, treatments, medications, or medical outcomes.
- For concerns, invite the reviewer to contact the clinic directly — but do NOT include a phone number or email in the public reply.
- No hashtags, emojis, URLs, or promotional language.

Business Description:
- Maximum 750 characters total.
- The first 250 characters are critical — they appear in the truncated Google Search preview.
- Describe what the clinic does, who it serves, and what makes the experience good. No promotional claims or superlatives.

Media / Photos:
- Ideal dimensions: 1200 × 900 px (4:3 ratio). Minimum 720 × 720 px.
- Format: JPG or PNG. Size: 10 KB – 5 MB.
- Keep important content (faces, logos, text) in the central 80% — edges get cropped in previews.
- Photos should be well-lit, in focus, and representative of the real clinic environment.`;

const toolDeclarations = [
  {
    name: 'get_all_gbp_data',
    description: 'Fetch ALL GBP data at once: profile, reviews, posts, services, media, and insights. Use for a complete business overview.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'fetch_reviews',
    description: 'Fetch all customer reviews from Google Business Profile with ratings, text, reply status, and timestamps.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'reply_to_review',
    description: 'Post an owner reply to a specific customer review.',
    parameters: {
      type: 'object',
      properties: {
        reviewName: { type: 'string', description: 'The full resource name of the review (e.g. accounts/.../locations/.../reviews/ABC123)' },
        replyText: { type: 'string', description: 'The reply text to post publicly on the review' }
      },
      required: ['reviewName', 'replyText']
    }
  },
  {
    name: 'delete_review_reply',
    description: 'Delete the existing owner reply from a specific review.',
    parameters: {
      type: 'object',
      properties: {
        reviewName: { type: 'string', description: 'The full resource name of the review' }
      },
      required: ['reviewName']
    }
  },
  {
    name: 'get_posts',
    description: 'Fetch all Google local posts for the business (announcements, offers, events).',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'create_post',
    description: 'Create a new Google local post visible on the business profile.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'The post body text' },
        topicType: {
          type: 'string',
          enum: ['STANDARD', 'OFFER', 'EVENT'],
          description: 'STANDARD for announcements/updates, OFFER for promotions, EVENT for events'
        },
        callToActionType: {
          type: 'string',
          enum: ['BOOK', 'CALL', 'LEARN_MORE', 'ORDER', 'SHOP', 'SIGN_UP'],
          description: 'Optional call-to-action button type'
        },
        callToActionUrl: { type: 'string', description: 'URL for the call-to-action button (required if callToActionType is set)' }
      },
      required: ['summary', 'topicType']
    }
  },
  {
    name: 'delete_post',
    description: 'Delete a Google local post by its resource name.',
    parameters: {
      type: 'object',
      properties: {
        postName: { type: 'string', description: 'The full resource name of the post' }
      },
      required: ['postName']
    }
  },
  {
    name: 'get_profile',
    description: 'Fetch the full business profile: name, address, phone, website, business hours, description, and categories.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'update_profile',
    description: 'Update specific fields on the business profile.',
    parameters: {
      type: 'object',
      properties: {
        updateData: {
          type: 'object',
          description: 'Object containing fields to update, e.g. {"websiteUri": "https://...", "description": "..."}'
        },
        updateMask: {
          type: 'string',
          description: 'Comma-separated field paths to update, e.g. "websiteUri,description"'
        }
      },
      required: ['updateData', 'updateMask']
    }
  },
  {
    name: 'get_services',
    description: 'Fetch the list of medical services offered at the clinic as shown on Google.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'list_media',
    description: 'Fetch all photos and videos currently on the Google Business Profile.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'upload_media',
    description: 'Upload a new photo or video to the Google Business Profile using a public URL.',
    parameters: {
      type: 'object',
      properties: {
        sourceUrl: { type: 'string', description: 'Publicly accessible URL of the image or video to upload' },
        mediaFormat: { type: 'string', enum: ['PHOTO', 'VIDEO'], description: 'Type of media' },
        description: { type: 'string', description: 'Optional caption for the media' }
      },
      required: ['sourceUrl', 'mediaFormat']
    }
  },
  {
    name: 'delete_media',
    description: 'Delete a media item (photo or video) from the Google Business Profile.',
    parameters: {
      type: 'object',
      properties: {
        mediaId: { type: 'string', description: 'The full resource name of the media item' }
      },
      required: ['mediaId']
    }
  },
  {
    name: 'get_insights',
    description: 'Fetch Google Business Profile performance metrics (search impressions, Maps views, website clicks, phone call clicks, direction requests) for any supported range. Defaults to the last 28 days. Google exposes up to ~18 months of history.',
    parameters: {
      type: 'object',
      properties: {
        period: {
          type: 'string',
          enum: ['last7', 'last28', 'last90', 'last180', 'last365', 'thisMonth', 'lastMonth', 'thisYear'],
          description: 'Named preset range. Use this for requests like "this month", "last 90 days", "this year".'
        },
        days: {
          type: 'integer',
          description: 'Rolling window ending today, in days (1–540). Ignored if period or startDate/endDate is supplied.'
        },
        startDate: {
          type: 'string',
          description: 'Explicit start date in YYYY-MM-DD. Must be paired with endDate.'
        },
        endDate: {
          type: 'string',
          description: 'Explicit end date in YYYY-MM-DD. Must be paired with startDate.'
        }
      },
      required: []
    }
  }
];

async function executeTool(name, args) {
  try {
    switch (name) {
      case 'get_all_gbp_data': {
        const [profile, reviews, posts, services, media, insights] = await Promise.allSettled([
          gbpClient.getProfile(),
          gbpClient.fetchReviews(),
          gbpClient.getPosts(),
          gbpClient.getServiceList(),
          gbpClient.listMedia(),
          gbpClient.getInsights()
        ]);
        return {
          profile:  profile.status  === 'fulfilled' ? profile.value  : { error: profile.reason?.message  },
          reviews:  reviews.status  === 'fulfilled' ? reviews.value  : { error: reviews.reason?.message  },
          posts:    posts.status    === 'fulfilled' ? posts.value    : { error: posts.reason?.message    },
          services: services.status === 'fulfilled' ? services.value : { error: services.reason?.message },
          media:    media.status    === 'fulfilled' ? media.value    : { error: media.reason?.message    },
          insights: insights.status === 'fulfilled' ? insights.value : { error: insights.reason?.message }
        };
      }
      case 'fetch_reviews':
        return await gbpClient.fetchReviews();

      case 'reply_to_review':
        await gbpClient.replyToReview(args.reviewName, args.replyText);
        return { success: true };

      case 'delete_review_reply':
        await gbpClient.deleteReviewReply(args.reviewName);
        return { success: true };

      case 'get_posts':
        return await gbpClient.getPosts();

      case 'create_post': {
        const postData = { languageCode: 'en-US', summary: args.summary, topicType: args.topicType };
        if (args.callToActionType) {
          postData.callToAction = { actionType: args.callToActionType };
          if (args.callToActionUrl) postData.callToAction.url = args.callToActionUrl;
        }
        const post = await gbpClient.createPost(postData);
        return { success: true, post };
      }

      case 'delete_post':
        await gbpClient.deletePost(args.postName);
        return { success: true };

      case 'get_profile':
        return await gbpClient.getProfile();

      case 'update_profile': {
        const result = await gbpClient.updateProfile(args.updateData, args.updateMask);
        return { success: true, result };
      }

      case 'get_services':
        return await gbpClient.getServiceList();

      case 'list_media':
        return await gbpClient.listMedia();

      case 'upload_media': {
        const mediaData = { mediaFormat: args.mediaFormat, sourceUrl: args.sourceUrl };
        if (args.description) mediaData.description = args.description;
        const media = await gbpClient.uploadMedia(mediaData);
        return { success: true, media };
      }

      case 'delete_media':
        await gbpClient.deleteMedia(args.mediaId);
        return { success: true };

      case 'get_insights': {
        const opts = {};
        if (args.startDate) opts.startDate = args.startDate;
        if (args.endDate)   opts.endDate   = args.endDate;
        if (args.period)    opts.period    = args.period;
        if (args.days)      opts.days      = args.days;
        return await gbpClient.getInsights(opts);
      }

      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err.message || 'Tool execution failed' };
  }
}

function isQuotaError(err) {
  const msg = err.message || '';
  return msg.includes('429') || msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Too Many Requests');
}

async function sendWithRetry(chat, payload, maxRetries = 1) {
  let delay = 5000; // 5s — one retry only, keeps total under 50s server timeout
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await chat.sendMessage(payload);
    } catch (err) {
      if (isQuotaError(err) && attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      if (isQuotaError(err)) {
        const e = new Error('429 quota exceeded');
        e.isQuota = true;
        throw e;
      }
      throw err;
    }
  }
}

export async function runAgentChat(userMessage, history = []) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    tools: [{ functionDeclarations: toolDeclarations }],
    systemInstruction: SYSTEM_INSTRUCTION
  });

  const chat = model.startChat({ history });

  let result = await sendWithRetry(chat, userMessage);
  let response = result.response;

  // Agentic loop: execute tools until Gemini produces a final text response.
  // Max 5 iterations to prevent runaway loops when Gemini keeps requesting tools.
  const MAX_TOOL_ROUNDS = 5;
  let toolRounds = 0;
  while (toolRounds < MAX_TOOL_ROUNDS && response.functionCalls() && response.functionCalls().length > 0) {
    toolRounds++;
    const calls = response.functionCalls();

    const toolResults = [];
    for (const call of calls) {
      const toolResult = await executeTool(call.name, call.args || {});
      toolResults.push({
        functionResponse: { name: call.name, response: toolResult }
      });
    }

    result = await sendWithRetry(chat, toolResults);
    response = result.response;
  }

  // If Gemini still wants more tools after hitting the cap, force a text reply.
  if (response.functionCalls() && response.functionCalls().length > 0) {
    result = await sendWithRetry(chat, [{ text: 'Please summarize your findings now and respond with text only.' }]);
    response = result.response;
  }

  // Safely extract reply text — response.text() throws on safety blocks or empty candidates
  let reply;
  try {
    reply = response.text();
  } catch {
    reply = null;
  }
  if (!reply || !reply.trim()) {
    reply = "I wasn't able to generate a response. Please try rephrasing your question.";
  }

  const updatedHistory = await chat.getHistory();

  // We keep the full history so the model knows what it has already fetched
  // and doesn't hit rate limits by re-fetching the same data every turn.
  // We only cap the total length to keep the context window manageable.
  const trimmedHistory = updatedHistory.slice(-20);

  return { reply, history: trimmedHistory };
}

/**
 * Plain text generation — no tools, no history. Used by the autonomous
 * orchestrator to draft a post body or a review reply that will be
 * validated by policyGuard before publishing.
 */
export async function generateText(prompt, { temperature = 0.7, maxOutputTokens = 400 } = {}) {
  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    generationConfig: { temperature, maxOutputTokens },
  });
  let delay = 5000;
  for (let attempt = 0; attempt <= 1; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text || !text.trim()) throw new Error('empty_generation');
      return text.trim();
    } catch (err) {
      if (isQuotaError(err) && attempt === 0) {
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw err;
    }
  }
}

