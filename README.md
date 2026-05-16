# Autonomous Google Ads Agent System

This project implements an autonomous multi-agent system designed to optimize Google Ads campaigns, aiming to maximize Return on Investment (ROI) and minimize ad spend waste. It continuously monitors, analyzes, and *adjusts* campaign parameters, ensuring ongoing optimization for improved ad campaign performance and reduced waste.

## Application Overview

The application serves as a dual-purpose tool for managing Google Ads campaigns:

1.  **Web Dashboard:** Offers a user-friendly interface for manual oversight. It allows users to view and interact with campaign data for a specific Google Ads account, providing insights into campaigns, ad groups, and individual ads.
2.  **Agent System (Synapse):** This is the core automation and optimization engine. It's designed to intelligently analyze Google Ads data and execute strategic adjustments to campaigns, aiming to improve performance, efficiency, and return on investment (ROI) without continuous manual intervention.

For a more detailed explanation of the application's core functionality, architecture, and agent roles, please refer to the `GEMINI.md` file in the project root.

## Architecture

The system is built around a central `Agent Orchestrator` that coordinates three specialized agents, each responsible for a distinct aspect of campaign management:

1.  **Agent Orchestrator (`src/synapse/agent-orchestrator.js`)**
    *   The central brain of the Synapse system. It initializes and manages the workflow of the specialized agents.
    *   Reads campaign configurations from the database and defines the operational cycle, ensuring agents perform their tasks in a logical sequence.

2.  **ROI Sentry (`src/synapse/agents/roi-sentry/index.js`)**
    *   Monitors campaign budgets and performance metrics (e.g., cost, clicks, conversions).
    *   Identifies campaigns that are nearing budget limits or underperforming, and can trigger alerts or corrective actions.

3.  **Intent Surgeon (`src/synapse/agents/intent-surgeon/index.js`)**
    *   Analyzes search term reports to identify irrelevant or underperforming search queries.
    *   Identifies and *injects* negative keywords into campaigns via the Google Ads API to eliminate wasted ad spend on unqualified clicks.

4.  **Persuasion Architect (`src/synapse/agents/persuasion-architect/index.js`)**
    *   Leverages AI (specifically the Gemini API) to analyze existing ad copy and its performance.
    *   Generates optimized ad headlines and descriptions, which are then *updated* in Google Ads to improve ad relevance and conversion rates.

5.  **Google Ads API Manager (`src/synapse/services/google-ads-api-manager/index.js`)**
    *   A foundational service that handles all interactions with the Google Ads API.
    *   Manages authentication, provides standardized methods for querying data, and *performs real mutations* (e.g., adding keywords, updating ads, creating campaigns) directly on the Google Ads platform.

## How It Works (Operational Workflow)

The Synapse system operates through a continuous optimization cycle driven by the `Agent Orchestrator` and its specialized agents:

1.  **Data Acquisition:** The `AgentOrchestrator` initiates agents. These agents then utilize the `GoogleAdsApiManager` to query the Google Ads API, retrieving specific data relevant to their optimization goals (e.g., `IntentSurgeon` fetches search query reports).
2.  **Intelligent Analysis:** Each agent analyzes the acquired data using its specialized logic to identify opportunities for improvement or potential issues.
    *   **ROISentry:** Monitors financial metrics (budget, cost, conversions) to ensure campaigns are on track and identify areas for cost efficiency or increased ROI.
    *   **IntentSurgeon:** Analyzes search terms to pinpoint irrelevant or underperforming queries, identifying candidates for negative keywords to prevent wasteful spending.
    *   **PersuasionArchitect:** Focuses on creative optimization, potentially using generative AI techniques to re-write or suggest improvements to ad headlines, descriptions, and other ad copy elements.
3.  **Action Execution (Real-Time):** Based on its analysis, an agent formulates concrete actions. These actions are passed to the `GoogleAdsApiManager`'s `mutate` method, which now directly sends these actions to the Google Ads API. This allows agents to *actually implement* changes (e.g., adding negative keywords, updating ad copy) within the Google Ads account.
4.  **Logging and Auditing:** Every step of this process—from data analysis to executed mutations—is meticulously logged in the PostgreSQL database, providing a comprehensive audit trail and historical context for agent performance and campaign changes.

## What is an "Agent" in this Context?

In this application, an "agent" refers to a specialized, autonomous software module designed to perform a specific optimization task within the Google Ads ecosystem. These agents are not general-purpose AI; rather, they are focused, rule-based or AI-enhanced components that:

*   Operate with a defined objective (e.g., improve ROI, enhance ad relevance).
*   Interact with the Google Ads API to gather data and execute changes.
*   Log their activities and decisions in the application's database.
*   Are orchestrated by the `AgentOrchestrator` to work synergistically towards overall campaign optimization.

By automating these processes, the application aims to continuously enhance Google Ads campaign effectiveness and free up human marketers to focus on higher-level strategy.

## Setup & Installation

To set up and run this project, you will need to configure your environment with the necessary API credentials.

### Prerequisites

*   Node.js (LTS recommended) and npm
*   A Google Cloud Project with the Google Ads API enabled.
*   Access to the Google Ads API with a Developer Token, Client ID, Client Secret, and Refresh Token. You can find more information on setting up Google Ads API access [here](https://developers.google.com/google-ads/api/docs/guides/get-started).
*   A Google AI Studio (Gemini API) key for AI-driven optimizations.

### Environment Variables

Create a `.env` file in the root directory of this project and populate it with the following variables:

```dotenv
GOOGLE_CLIENT_ID="YOUR_GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_GOOGLE_CLIENT_SECRET"
GOOGLE_REDIRECT_URI="YOUR_GOOGLE_REDIRECT_URI"
GOOGLE_REFRESH_TOKEN="YOUR_GOOGLE_REFRESH_TOKEN"
DEVELOPER_TOKEN="YOUR_GOOGLE_ADS_DEVELOPER_TOKEN"
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
DATABASE_URL="YOUR_VERCEL_POSTGRES_DATABASE_URL" # e.g., postgres://user:password@host:port/database

# Optional: Default Google Ads Customer IDs (used by GoogleAdsApiManager)
# DEFAULT_LOGIN_CUSTOMER_ID="YOUR_MANAGER_ACCOUNT_ID_WITHOUT_HYPHENS" # e.g., 1234567890
# DEFAULT_OPERATING_CUSTOMER_ID="YOUR_OPERATING_ACCOUNT_ID_WITHOUT_HYPHENS" # e.g., 9876543210
```

*   **`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `GOOGLE_REFRESH_TOKEN`**: These are for OAuth2 authentication with the Google Ads API.
*   **`DEVELOPER_TOKEN`**: Your Google Ads API Developer Token.
*   **`GEMINI_API_KEY`**: Your API key for accessing the Google Gemini model, used by the `PersuasionArchitect`.
*   **`DATABASE_URL`**: The connection string for your Vercel Postgres database.

### Installation Steps

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd GOOGLE ADS APP
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
    Ensure you run `npm install` in the root and potentially in the `node_modules` of the sub-agents if they have specific dependencies not hoisted. (The provided directory structure implies `node_modules` might be nested). A simpler approach is to use a single `package.json` at the root for all dependencies.

### Database Setup

This project uses PostgreSQL for persistence, specifically designed to work seamlessly with Vercel Postgres.

1.  **Create a Vercel Postgres Database:**
    *   Follow the instructions on [Vercel's documentation](https://vercel.com/docs/storage/vercel-postgres) to create a new Postgres database.
    *   Once created, obtain your `DATABASE_URL` connection string and add it to your `.env` file (as described above) and to your Vercel project's environment variables.
2.  **Initialize Database Schema:**
    *   Run the database initialization script to create the necessary tables:
        ```bash
        node src/common/init_db.js
        ```
    *   This will create tables for `campaign_configurations`, `agent_runs`, `roi_sentry_logs`, `intent_surgeon_logs`, and `persuasion_architect_logs`.
3.  **Add Initial Campaign Configuration:**
    *   To run the `AgentOrchestrator`, you need at least one entry in the `campaign_configurations` table. You can insert one manually into your database, for example:
        ```sql
        INSERT INTO campaign_configurations (customer_id, campaign_id, config_name)
        VALUES ('YOUR_GOOGLE_ADS_CUSTOMER_ID', 'YOUR_GOOGLE_ADS_CAMPAIGN_ID', 'My First Campaign');
        ```
        Replace `'YOUR_GOOGLE_ADS_CUSTOMER_ID'` and `'YOUR_GOOGLE_ADS_CAMPAIGN_ID'` with actual values. Note the `id` of this new entry (it will typically be 1 if it's the first entry). You will use this `id` when running the orchestrator.

## Usage

To run the autonomous agent system:

```bash
node src/synapse/agent-orchestrator.js [campaign_config_id]
```

Upon execution, the `AgentOrchestrator` will initiate its `run` cycle for the specified `campaign_config_id`. If no `campaign_config_id` is provided, it defaults to ID `1`. Ensure you have a corresponding entry in your `campaign_configurations` table.

## Future Enhancements

*   **Dynamic Campaign Selection**: Implement logic within the orchestrator to dynamically select campaigns for optimization based on user-defined criteria or overall account performance.
*   **Advanced Decision Making**: Integrate more sophisticated AI models for decision-making regarding budget adjustments, bidding strategies, and more nuanced ad copy generation.
*   **User Interface**: Develop a web-based UI to configure agents, view performance dashboards, and receive real-time alerts.
*   **Error Handling & Reporting**: Enhance error handling, logging, and automated reporting mechanisms for job status and identified optimizations.
*   **Testing Framework**: Implement a comprehensive testing suite to ensure the reliability and effectiveness of agent operations.

