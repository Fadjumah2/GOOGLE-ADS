import logger from './utils/logger.js';
import AgentOrchestrator from './handlers/agent/orchestrator/index.js';

// Global orchestrator instance
let orchestrator;

const getOrchestrator = () => {
    if (!orchestrator) {
        logger.info('Initializing unified AgentOrchestrator...');
        orchestrator = new AgentOrchestrator();
    }
    return orchestrator;
};

// ... In server.js or handler:
// const orchestrator = getOrchestrator();
// await orchestrator.runAdsCycle(campaignConfigId);

// Add these to server.js routes
export const handleOptimizeCampaign = async (req, res) => {
    const { campaignId } = req.params;
    try {
        const orchestrator = getOrchestrator();
        // Assuming runAdsCycle needs to be adapted or expanded
        // await orchestrator.runAdsCycle(campaignId); 
        res.json({ success: true, message: `Workflow started for ${campaignId}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
