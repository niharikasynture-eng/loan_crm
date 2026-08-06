import mongoose from 'mongoose';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Deal from '@/models/Deal';
import { ROLES } from '@/lib/auth';

/**
 * Automatically determines the next assigned sales agent for a new lead
 * based on the organization's configured lead routing strategy (round_robin or performance).
 */
export async function getAutoAssignedAgent(
  organizationId: string | mongoose.Types.ObjectId
): Promise<string | null> {
  try {
    const org = await Organization.findById(organizationId);
    if (!org) return null;

    const settings = org.settings || {};
    const mode = settings.leadRoutingMode || 'round_robin';
    const autoAssign = settings.autoAssignNewLeads !== false;

    if (!autoAssign || mode === 'manual') {
      return null;
    }

    // Find all active sales agents in the organization
    const activeAgents = await User.find({
      organizationId,
      role: ROLES.SALES_AGENT,
      isActive: true,
    })
      .select('_id name email')
      .sort({ createdAt: 1 })
      .lean();

    if (activeAgents.length === 0) {
      return null;
    }

    if (mode === 'performance') {
      // Aggregate won deals per agent for this organization
      const agentIds = activeAgents.map((a) => a._id);
      const performanceStats = await Deal.aggregate([
        {
          $match: {
            organizationId: new mongoose.Types.ObjectId(organizationId.toString()),
            assignedTo: { $in: agentIds },
            stage: 'won',
          },
        },
        {
          $group: {
            _id: '$assignedTo',
            wonCount: { $sum: 1 },
          },
        },
        { $sort: { wonCount: -1 } },
      ]);

      if (performanceStats.length > 0) {
        const topAgentId = performanceStats[0]._id.toString();
        return topAgentId;
      }
    }

    // Default: Round-Robin distribution
    const lastIndex = settings.lastAssignedAgentIndex || 0;
    const nextIndex = lastIndex % activeAgents.length;
    const selectedAgent = activeAgents[nextIndex];

    // Atomically increment the last assigned index for the next lead
    await Organization.updateOne(
      { _id: organizationId },
      { $set: { 'settings.lastAssignedAgentIndex': nextIndex + 1 } }
    );

    return selectedAgent._id.toString();
  } catch (err) {
    console.error('[SMART_ROUTING] Failed to auto-route lead:', err);
    return null;
  }
}
