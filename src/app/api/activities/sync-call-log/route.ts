// Fix applied at 13:20 PM - Ensuring 'let' is recognized
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Activity from '@/models/Activity';
import Lead from '@/models/Lead';
import User from '@/models/User';
import CallLog from '@/models/CallLog';
import fs from 'fs';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const contentType = req.headers.get('content-type') || '';
    let rawData: any;
    
    // DEBUG LOGGING - Capture everything
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

    const logEntry = `\n[${new Date().toISOString()}] SYNC ATTEMPT:\nParams: ${JSON.stringify(Object.fromEntries(searchParams))}\nBody: ${JSON.stringify(rawData)}\n`;
    fs.appendFileSync('sync_debug.log', logEntry);
    
    console.log('\x1b[36m%s\x1b[0m', '--- 📱 SYNC REQUEST RECEIVED FROM PHONE ---');
    console.log(`Phone: ${rawData.phone || 'Unknown'}, Duration: ${rawData.duration || '0'}`);

    // Wrap in array if it's a single object
    const logs = Array.isArray(rawData) ? rawData : [rawData];
    const results = [];

    for (const body of logs) {
      // 1. Unified Key Matching (Flexible for 30+ different phone types)
      const allData = { ...Object.fromEntries(searchParams), ...body };
      const allKeys = Object.keys(allData).map(k => k.trim().toLowerCase());

      // Find Token
      const tokenKey = Object.keys(allData).find(k => k.trim().toLowerCase() === 'token');
      const tokenRaw = tokenKey ? String(allData[tokenKey]) : '';
      
      // Find Phone/Number
      const phoneKey = Object.keys(allData).find(k => ['phone', 'number', 'call_number', 'from', 'to', 'contact_number'].includes(k.trim().toLowerCase()));
      const rawPhone = phoneKey ? String(allData[phoneKey]) : '';

      // Find Duration (Crucial: Handles " [15s] " or "60" or "01:00")
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
        const msg = `Error: Invalid Token (${tokenRaw})`;
        fs.appendFileSync('sync_debug.log', `${msg}\n`);
        results.push({ error: 'Invalid sync token', tokenReceived: tokenRaw });
        continue;
      }

      // Clean Duration (Handle decimals from Now-starttime calculation)
      const duration = Math.round(parseFloat(durationRaw)) || 0;
      
      // Clean Phone Number
      const normalizedIncoming = rawPhone.replace(/\D/g, '');
      
      if (!normalizedIncoming || normalizedIncoming.length < 5) {
        const msg = `Error: Invalid Phone (${rawPhone})`;
        fs.appendFileSync('sync_debug.log', `${msg}\n`);
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
        // PREDICTIVE MATCHING (Fix for Samsung bug: phone sends its own number instead of lead's)
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
            fs.appendFileSync('sync_debug.log', `Predictive Match: Lead ${matchedLead.name} found from pending CRM action.\n`);
            // Use this lead and mark the pending activity as completed so we don't reuse it
            lead = matchedLead;
            pendingCall.status = 'completed';
            await pendingCall.save();
          }
        }
      }

      if (!lead) {
        const msg = `Warning: Lead not found for number ${normalizedIncoming}`;
        fs.appendFileSync('sync_debug.log', `${msg}\n`);
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

      // ────── SMART CORRECTION (Overwrite Browser Timer) ──────
      // If there's a "Browser Timer" activity/calllog for the same lead/user within 15 mins,
      // overwrite it with the real hardware duration instead of duplicating.
      const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
      
      // 1. Find existing Activity
      let activityToUpdate = await Activity.findOne({
        leadId: lead._id,
        createdBy: user._id,
        type: 'call',
        createdAt: { $gte: fifteenMinsAgo },
        notes: /Browser Timer/i
      }).sort({ createdAt: -1 });

      // 2. Find existing CallLog
      let callLogToUpdate = await CallLog.findOne({
        leadId: lead._id,
        salesPersonId: user._id,
        createdAt: { $gte: fifteenMinsAgo },
        $or: [
          { syncId: 'MANUAL' },
          { notes: /Browser Timer/i },
          { status: 'initiated' }
        ]
      }).sort({ createdAt: -1 });

      const callTypeLabel = typeRaw.toLowerCase().includes('incoming') ? 'Incoming' : 'Outgoing';
      const verifiedNotes = `✅ Verified ${callTypeLabel} Call. Duration: ${duration}s`;

      if (activityToUpdate || callLogToUpdate) {
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
          callLogToUpdate.notes = `Hardware Verified Override. Real logs: ${duration}s`;
          callLogToUpdate.endedAt = new Date();
          await callLogToUpdate.save();
        } else if (activityToUpdate?.callLogId) {
          // If we found an activity but it linked to a callLog we missed in the query
          await CallLog.findByIdAndUpdate(activityToUpdate.callLogId, {
            duration: duration,
            connectedDuration: duration,
            syncId: syncId,
            status: 'completed',
            notes: `Hardware Verified Override via Activity Link.`,
            endedAt: new Date()
          });
        }
        
        fs.appendFileSync('sync_debug.log', `CORRECTION (DEEP MERGE): Updated browser records for ${lead.name} with verified ${duration}s\n`);
        results.push({ status: 'corrected', activityId: activityToUpdate?._id, duration, lead: lead.name });
        continue; // Skip creation
      }

      // ────── SAVE NEW RECORDS (If no correction needed) ──────
      // 1. Create Official Call Log
      await CallLog.create({
        leadId: lead._id,
        organizationId: user.organizationId,
        salesPersonId: user._id,
        status: 'completed',
        duration: duration,
        connectedDuration: duration,
        startedAt: new Date(timestampRaw),
        endedAt: new Date(),
        syncId,
        notes: `Automated ${callTypeLabel} call. (Hardware Verified)`,
      });

      // 2. Create Public Activity Feed Item
      const activity = await Activity.create({
        organizationId: user.organizationId,
        leadId: lead._id,
        type: 'call',
        duration: duration,
        syncId,
        notes: `✅ Verified ${callTypeLabel} Call. Duration: ${duration}s`,
        createdBy: user._id,
        status: 'completed',
        completedAt: new Date(),
      });

      // 3. Update Lead Status
      lead.lastCalledAt = new Date();
      lead.totalCalls = (lead.totalCalls || 0) + 1;
      lead.status = 'contacted';
      if (lead.pipelineStage === 'new') lead.pipelineStage = 'contacted';
      await lead.save();

      fs.appendFileSync('sync_debug.log', `Success: Logged ${duration}s call for ${lead.name}\n`);
      results.push({ status: 'success', activityId: activity._id, duration, lead: lead.name });
    }

    const debugId = `VERIFIED-${Math.floor(Math.random() * 9000) + 1000}`;
    console.log(`\x1b[35m[${debugId}]\x1b[0m SYNC COMPLETED: ${results.length} results processed.`);

    return NextResponse.json({ 
      success: true, 
      debugId,
      processed: results.length,
      results 
    });
  } catch (err: any) {
    console.error('CRITICAL SYNC ERROR:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
