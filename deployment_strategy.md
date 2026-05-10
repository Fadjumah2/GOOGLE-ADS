# Synapse Deployment Strategy

This document outlines a high-level deployment strategy for the "Synapse" autonomous Google Ads agent, designed with a microservices architecture.

## 1. Core Principles

*   **Containerization:** Each microservice (Supervisor, Google Ads API Manager, Intent Surgeon, Persuasion Architect, ROI Sentry, Location Sentry) will be containerized using Docker. This ensures consistency across environments and simplifies dependency management.
*   **Scalability:** The architecture will support horizontal scaling of individual services based on demand.
*   **Resilience:** Services will be designed for fault tolerance, with proper error handling, retry mechanisms, and health checks.
*   **Security:** Environment variables and sensitive credentials will be managed securely.
*   **Observability:** Comprehensive logging and monitoring will be in place.

## 2. Environment Configuration

*   **Environment Variables:** All sensitive information (Google Ads API credentials, Gemini API key, database connection strings, etc.) will be supplied via environment variables at runtime, not hardcoded into images.
*   **`.env` files:** Used for local development (e.g., with Docker Compose).
*   **Secret Management:** For production, utilize cloud-native secret management services (e.g., Google Secret Manager, Kubernetes Secrets, or Vercel Environment Variables for DATABASE_URL) to inject credentials securely into containers/serverless functions.

## 3. Local Development & Testing

*   **Docker Compose:** A `docker-compose.yml` file will be used to orchestrate all services for local development and testing. This will allow developers to spin up the entire Synapse environment with a single command.
*   **Hot-reloading:** Configure development environments for hot-reloading where feasible to speed up development cycles.

## 4. Production Deployment

*   **Orchestration Platform:**
    *   **Vercel:** Recommended for deploying the frontend (client) and the Express.js API backend (server.js) as serverless functions. Vercel provides seamless deployments, automatic scaling, and integration with various services.
    *   **Google Kubernetes Engine (GKE):** Recommended for robust, scalable, and highly available production deployments, especially for the Agent Orchestrator and other long-running microservices if not deployed on a serverless platform. GKE provides powerful orchestration, auto-scaling, and self-healing capabilities.
    *   **Google Cloud Run:** A viable option for individual services that are stateless and event-driven, offering serverless container deployment with auto-scaling and pay-per-use billing. Can be combined with GKE or Vercel for different service types.
*   **Networking:**
    *   **Internal Communication:** Services will communicate via internal DNS names provided by the orchestration platform (e.g., Kubernetes Services).
    *   **External Access:** Limited external access, primarily for the CLI/Dashboard (if web-based). API Gateways can be used to manage external traffic.
*   **Storage:**
    *   **Vercel Postgres (PostgreSQL):** Used for all persistent data, including campaign configurations, agent run logs (`agent_runs`), and agent-specific logs like ROI Sentry (`roi_sentry_logs`), Intent Surgeon (`intent_surgeon_logs`), and Persuasion Architect (`persuasion_architect_logs`). This replaces the previous local SQLite database for Intent Surgeon, providing a robust and scalable solution.
    *   **Ephemeral Storage (for serverless functions):** Serverless functions (deployed on Vercel or Cloud Run) will utilize ephemeral storage for temporary files if needed, but critical data will always be persisted to Vercel Postgres.

## 5. Monitoring & Logging

*   **Centralized Logging:** All services will log to standard output/error (stdout/stderr). The orchestration platform will capture these logs and forward them to a centralized logging solution (e.g., Google Cloud Logging / Log Explorer).
*   **Metrics:** Services will expose metrics (e.g., Prometheus format) that can be scraped and visualized using monitoring tools (e.g., Google Cloud Monitoring, Prometheus, Grafana).
*   **Alerting:** Set up alerts for critical errors, performance degradation, and budget thresholds (leveraging ROI Sentry's outputs).

## 6. Continuous Integration/Continuous Deployment (CI/CD)

*   **Automated Builds:** Trigger automated Docker image builds upon code commits to a version control system (e.g., GitHub, GitLab, Cloud Source Repositories).
*   **Automated Testing:** Run unit, integration, and end-to-end tests within the CI pipeline.
*   **Automated Deployment:** Deploy validated container images to staging and production environments automatically upon successful tests. Tools like Cloud Build, Jenkins, or GitHub Actions can be used.

## 7. Rollback Strategy

*   Maintain versioned Docker images. In case of issues, the orchestration platform can be used to quickly roll back to a previous stable version of any service.
