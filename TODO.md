# Synapse Project TODO List

This document outlines the tasks for transforming the Google Ads MVP into a production-grade autonomous agent named "Synapse".

## Phase 0: Supervisor Implementation - COMPLETED

## Phase 1: Architecture & Foundation - COMPLETED

- [x] **Review Existing Codebase**: Understand `server.js` and `client/script.js` structure, Google Ads API integration, and authentication flow.
- [x] **Design Microservices Blueprint**: Outline the high-level architecture for the supervisor and sub-agents, including communication patterns.
- [x] **Set up Project Structure**: Create a new directory structure for "Synapse" (e.g., `src/supervisor`, `src/agents/intent_surgeon`, etc.).
- [x] **Integrate SQLite for Learned Negatives**: Set up SQLite database and initial schema for caching negative keywords.

## Phase 2: Sub-Agent Development - COMPLETED

- [x] **Implement Intent Surgeon**:
    - [x] Develop logic for search term analysis.
    - [x] Implement automated negative keyword injection (Exact Match prioritization).
- [x] **Implement Persuasion Architect**:
    - [x] Integrate Gemini 3.1 Pro API.
    - [x] Develop logic for dynamic ad copy rewriting based on conversion data.
- [x] **Implement ROI Sentry**:
    - [x] Develop real-time budget monitoring.
    - [x] Implement safety-pausing mechanisms.

## Phase 3: Google Ads API Integration & Specific Features - COMPLETED

- [x] **Enforce Customer ID Separation**: Ensure strict separation of Login Customer ID (901-866-0123) and Operating Customer ID (602-231-7886) in all API calls.
- [x] **Implement Call-Only Ad Extension Prioritization**: Develop logic to prioritize Call-Only Ad extensions for medical intent campaigns.
- [x] **Implement Location Sentry**: Develop automated bid adjustment based on a 20km radius of Entebbe, Uganda.

## Phase 4: Robustness & User Interface - COMPLETED

- [x] **Develop Robust Error Handling**: Implement a comprehensive error-handling layer with sub-second cold starts.
- [x] **Design CLI/Dashboard Structure**: Create a clean interface for Eritage ENT Care's management.

## Phase 5: Testing & Deployment - COMPLETED

- [x] **Write Unit and Integration Tests**: Cover all new components and functionalities.
- [x] **Define Deployment Strategy**: Outline steps for deploying the production-grade application.
