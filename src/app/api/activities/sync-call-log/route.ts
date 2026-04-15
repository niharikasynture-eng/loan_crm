import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Activity from '@/models/Activity';
import Lead from '@/models/Lead';
import User from '@/models/User';
import CallLog from '@/models/CallLog';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const contentType = req.headers.get('content-type') || '';
    let rawData: any;
    
    // Parse body based on content type
    try {
      if (contentType.includes('application/json')) {
        rawData = await req.json();
      } else if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
        const formData = await req.formData();
        rawData = Object.fromEntries(formData);
      } else {
        rawData = Object.fromEntries(searchParams);
      }
    } catch (e) {
      rawData = Object.fromEntries(searchParams);
    }

    console.log('[SYNC] Request received:', JSON.stringify(rawData));

    // Wrap in array if it's a single object
    const logs = Array.isArray(rawData) ? rawData : [rawData];
    const results = [];

    for (const body of logs) {
      // 1. Unified Key Matching (Flexible for 30+ different phone types)
      const allData = { ...Object.fromEntries(searchParams), ...body };

      // Find Token
      const tokenKey = Object.keys(allData).find(k => k.trim().toLowerCase() === 'token');
      const tokenRaw = tokenKey ? String(allData[tokenKey]) : '';
      
      // Find Phone/Number
      const phoneKey = Object.keys(allData).find(k => ['phone', 'number', 'call_number', 'from', 'to', 'contact_number'].includes(k.trim().toLowerCase()));
      const rawPhone = phoneKey ? String(allData[phoneKey]) : '';

      // Find Duration
      const durationKey = Object.keys(allData).find(k => ['duration', 'dur', 'time', 'seconds', 'call_duration'].includes(k.trim().toLowerCase()));
      const durationRaw = durationKey ? String(allData[durationKey]) : '0';

      // Find Type
      const typeKey = Object.keys(allData).find(k => ['type', 'call_type', 'direction', 'mode'].includes(k.trim().toLowerCase()));
      const typeRaw = typeKey ? String(allData[typeKey]) : 'outgoing';

      // Find Time
      const timeKey = Object.keys(allData).find(k => ['timestamp', 'time', 'date', 'created_at'].includes(k.trim().toLowerCase()));
      const timestampRaw = timeKey ? String(allData[timeKey]) : new Date().toISOString();

      // Identify User (Salesperson) - STRICT MATCH ONLY
      let user = null;
      if (tokenRaw && tokenRaw.length > 5) {
        user = await User.findOne({ callSyncToken: tokenRaw });
      }

      if (!user) {
        console.log(`[SYNC] Invalid token: ${tokenRaw}`);
        results.push({ error: 'Invalid sync token', tokenReceived: tokenRaw });
        continue;
      }

      // Clean Duration
      const duration = Math.round(parseFloat(durationRaw)) || 0;
      
      // Clean Phone Number
      const normalizedIncoming = rawPhone.replace(/\D/g, '');
      
      if (!normalizedIncoming || normalizedIncoming.length < 5) {
        console.log(`[SYNC] Invalid phone: ${rawPhone}`);
        results.push({ error: 'Invalid phone', rawPhone });
        continue;
      }

      // Find Lead by Matching Last 10 Digits
      const leads = await Lead.find({ organizationId: user.organizationId });
      let lead = leads.find(l => {
        if (!l.phone) return false;
        const normalizedLead = l.phone.replace(/\D/g, '');
        return normalizedLead.endsWith(normalizedIncoming.slice(-10)) || 
               normalizedIncoming.endsWith(normalizedLead.slice(-10));
      });

      if (!lead) {
        // PREDICTIVE MATCHING (Fix for Samsung bug)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const pendingCall = await Activity.findOne({
          organizationId: user.organizationId,
          createdBy: user._id,
          type: 'call',
          status: 'pending',
          createdAt: { $gte: twoMinutesAgo }
        }).sort({ createdAt: -1 });

        if (pendingCall) {
          const matchedLead = await Lead.findById(pendingCall.leadId);
          if (matchedLead) {
            console.log(`[SYNC] Predictive Match: ${matchedLead.name}`);
            lead = matchedLead;
            pendingCall.status = 'completed';
            await pendingCall.save();
          }
        }
      }

      if (!lead) {
        console.log(`[SYNC] Lead not found for phone: ${normalizedIncoming}`);
        results.push({ status: 'ignored', message: 'Lead not found', phone: normalizedIncoming });
        continue;
      }

      // ────── UNIQUE ID & DEDUPLICATION ──────
      const syncId = body.syncId || body.id || `sync-${user._id}-${normalizedIncoming}-${duration}-${new Date(timestampRaw).getTime()}`;
      
      const existingActivity = await Activity.findOne({ syncId, organizationId: user.organizationId });
      if (existingActivity) {
        results.push({ status: 'duplicate', activityId: existingActivity._id });
        continue;
      }

      // ────── SMART CORRECTION (Overwrite Browser Timer if Smart Method was used) ──────
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      
      // Find existing browser-placeholder Activity
      const activityToUpdate = await Activity.findOne({
        leadId: lead._id,
        createdBy: user._id,
        type: 'call',
        createdAt: { $gte: oneHourAgo },
        notes: /Timer|Syncing|Manual/i
      }).sort({ createdAt: -1 });

      // Find existing browser-placeholder CallLog
      const callLogToUpdate = await CallLog.findOne({
        leadId: lead._id,
        salesPersonId: user._id,
        createdAt: { $gte: oneHourAgo },
        $or: [
          { syncId: 'MANUAL' },
          { notes: /Timer|Manual/i },
          { status: 'initiated' }
        ]
      }).sort({ createdAt: -1 });

      const callTypeLabel = typeRaw.toLowerCase().includes('incoming') ? 'Incoming' : 'Outgoing';
      const verifiedNotes = `✅ Verified ${callTypeLabel} Call. Duration: ${duration}s`;

      if (activityToUpdate || callLogToUpdate) {
        // Update existing browser placeholder records with hardware-verified data
        if (activityToUpdate) {
          activityToUpdate.duration = duration;
          activityToUpdate.notes = verifiedNotes;
          activityToUpdate.syncId = syncId;
          activityToUpdate.status = 'completed';
          activityToUpdate.completedAt = new Date();
          await activityToUpdate.save();
        }

        if (callLogToUpdate) {
          callLogToUpdate.duration = duration;
          callLogToUpdate.connectedDuration = duration;
          callLogToUpdate.syncId = syncId;
          callLogToUpdate.status = 'completed';
          callLogToUpdate.notes = `Hardware Verified. Real duration: ${duration}s`;
          callLogToUpdate.endedAt = new Date();
          await callLogToUpdate.save();
        } else if (activityToUpdate?.callLogId) {
          await CallLog.findByIdAndUpdate(activityToUpdate.callLogId, {
            duration,
            connectedDuration: duration,
            syncId,
            status: 'completed',
            notes: `Hardware Verified via Activity Link.`,
            endedAt: new Date()
          });
        }
        
        console.log(`[SYNC] CORRECTED browser record for ${lead.name} → ${duration}s`);
        results.push({ status: 'corrected', activityId: activityToUpdate?._id, duration, lead: lead.name });
        continue;
      }

      // ────── CREATE NEW RECORDS (Automate App: no browser placeholder exists) ──────
      const newCallLog = await CallLog.create({
        leadId: lead._id,
        organizationId: user.organizationId,
        salesPersonId: user._id,
        status: 'completed',
        duration,
        connectedDuration: duration,
        startedAt: new Date(timestampRaw),
        endedAt: new Date(),
        syncId,
        notes: `Automated ${callTypeLabel} call. (Hardware Verified)`,
      });

      const activity = await Activity.create({
        organizationId: user.organizationId,
        leadId: lead._id,
        type: 'call',
        duration,
        syncId,
        notes: verifiedNotes,
        createdBy: user._id,
        status: 'completed',
        completedAt: new Date(),
      });

      // Update Lead Status
      lead.lastCalledAt = new Date();
      lead.totalCalls = (lead.totalCalls || 0) + 1;
      lead.status = 'contacted';
      if (lead.pipelineStage === 'new') lead.pipelineStage = 'contacted';
      await lead.save();

      console.log(`[SYNC] SUCCESS: Logged ${duration}s call for ${lead.name} (${callTypeLabel})`);
      results.push({ status: 'success', activityId: activity._id, callLogId: newCallLog._id, duration, lead: lead.name });
    }

    return NextResponse.json({ 
      success: true, 
      processed: results.length,
      results 
    });
  } catch (err: any) {
    console.error('[SYNC] CRITICAL ERROR:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
