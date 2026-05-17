# Synapse Project TODO List

This document outlines the tasks for transforming the Google Ads MVP into a production-grade autonomous agent named "Synapse".

## Phase 0: Supervisor Implementation - COMPLETED

## Phase 1: Architecture & Foundation - COMPLETED

- [x] **Review Existing Codebase**: Understand `server.js` and `client/script.js` structure, Google Ads API integration, and authentication flow.
- [x] **Design Microservices Blueprint**: Outline the high-level architecture for the supervisor and sub-agents, including communication patterns.
- [x] **Set up Project Structure**: Create a new directory structure for "Synapse" (e.g., `src/supervisor`, `src/agents/intent_surgeon`, etc.).
- [x] **Integrate SQLite for Learned Negatives**: Set up SQLite database and initial schema for caching negative keywords.

## Phase 2: Sub-Agent Development - COMPLETED

- [x] **Implement Intent Surgeon (fleshed out with API integration and robust error handling)**:
    - [x] Develop logic for search term analysis (integrated with GoogleAdsApiManager).
    - [x] Implement automated negative keyword injection (integrated with GoogleAdsApiManager).
- [x] **Implement Persuasion Architect (fleshed out with API integration and robust error handling)**:
    - [x] Integrate Gemini 3.1 Pro API (integrated with GoogleAdsApiManager).
    - [x] Develop logic for dynamic ad copy rewriting based on conversion data (integrated with GoogleAdsApiManager).
- [x] **Implement ROI Sentry (fleshed out with API integration and robust error handling)**:
    - [x] Develop real-time budget monitoring (integrated with GoogleAdsApiManager).
    - [x] Implement safety-pausing mechanisms (integrated with GoogleAdsApiManager).

## Phase 3: Google Ads API Integration & Specific Features - COMPLETED

- [x] **Enforce Customer ID Separation**: Ensure strict separation of Login Customer ID (901-866-0123) and Operating Customer ID (602-231-7886) in all API calls.
- [x] **Implement Call-Only Ad Extension Prioritization (fleshed out with API integration and robust error handling)**: Develop logic to prioritize Call-Only Ad extensions for medical intent campaigns (integrated with GoogleAdsApiManager).
- [x] **Implement Location Sentry (fleshed out with API integration and robust error handling)**: Develop automated bid adjustment based on a 20km radius of Entebbe, Uganda (integrated with GoogleAdsApiManager).

## Phase 4: Robustness & User Interface - COMPLETED

- [x] **Develop Robust Error Handling**: Implement a comprehensive error-handling layer with sub-second cold starts.
- [x] **Design CLI/Dashboard Structure**: Create a clean interface for Eritage ENT Care's management.

## Phase 5: Testing & Deployment - COMPLETED

- [x] **Write Unit and Integration Tests**: Cover all new components and functionalities.
- [x] **Define Deployment Strategy**: Outline steps for deploying the production-grade application.

## Phase 6: Frontend Bug Fixes & UI Enhancements - COMPLETED

- [x] **Fix Critical Logic Bugs**:
    - [x] Calculate real KPI deltas or hide hardcoded values.
    - [x] Fix log panel to parse JSON instead of raw text.
    - [x] Implement robust error handling for all `fetch` calls.
- [x] **Optimize Initialization & Performance**:
    - [x] Consolidate `renderModeToggle` calls.
    - [x] Scope Lucide icon creation to improved performance.
- [x] **Enhance UX & Interaction**:
    - [x] Implement basic search logic for the Command Palette.
    - [x] Replace `alert()` with a non-blocking notification system.
    - [x] Add loading indicators for AI chat and agent executions.
- [x] **Refactor & Cleanup**:
    - [x] Move inline JS styles to `style.css`.
    - [x] Finish functional stubs in the Settings panel.

## Post-MVP Tasks

- [x] **Refactor for Google AI Studio Free Tier Compliance**:
    - [x] Implement Tiered Intelligence Strategy (Model string replacement).
    - [x] Implement Defensive Free-Tier Rate Limiting (5s request buffer).
    - [x] Optimize Output & Token Compaction (System prompt audit, JSON enforcement).
- [x] **Resolved Repository Access**: GitHub PAT permissions confirmed, `.env` purged from Git history.
- [x] **Code Push**: `mvp-development` branch pushed to remote repository.
- [x] **Dashboard Bug Fixes Implemented**: Addressed issues in timeline, logs, and integration sections (standardized error responses, fixed "Verify" button, enabled server-side logging, ensured DB schema initialization).
- [x] **Vercel Deployment Strategy Outlined**:
    - [x] Adapted `server.js` for Vercel serverless functions.
    - [x] Frontend (`client/`) reviewed for relative API calls.
    - [x] `vercel.json` created for routing.
- [ ] **Next: Vercel Project Creation (User Action Required)**
- [ ] **Next: Vercel Environment Variables Configuration (User Action Required)**
- [ ] **Further Enhancements:** Plan and implement features beyond the initial MVP.
