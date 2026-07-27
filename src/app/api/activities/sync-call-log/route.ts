import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Activity from '@/models/Activity';
import Lead from '@/models/Lead';
import User from '@/models/User';
import CallLog from '@/models/CallLog';

export async function GET(req: NextRequest) {
  return POST(req);
}

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
      const tokenRaw = tokenKey ? String(allData[tokenKey]).trim() : '';
      
      // Find Phone/Number (Support 20+ variations used by various phone APIs and MacroDroid/Automate)
      const phoneKey = Object.keys(allData).find(k => [
        'phone', 'number', 'call_number', 'from', 'to', 'contact_number',
        'phone_number', 'phonenumber', 'contact', 'caller_number', 'caller_id',
        'callerid', 'phone_no', 'phoneno', 'mobile', 'mobile_number', 'mobilenumber',
        'mobile_no', 'mobileno'
      ].includes(k.trim().toLowerCase()));
      const rawPhone = phoneKey ? String(allData[phoneKey]).trim() : '';

      // Find Duration (Support multiple duration representations)
      const durationKey = Object.keys(allData).find(k => [
        'duration', 'dur', 'time', 'seconds', 'call_duration', 'duration_seconds',
        'durationseconds', 'call_duration_seconds', 'call_duration_s', 'duration_s'
      ].includes(k.trim().toLowerCase()));
      const durationRaw = durationKey ? String(allData[durationKey]).trim() : '0';

      // Find Type (incoming vs outgoing)
      const typeKey = Object.keys(allData).find(k => [
        'type', 'call_type', 'direction', 'mode', 'calltype'
      ].includes(k.trim().toLowerCase()));
      const typeRaw = typeKey ? String(allData[typeKey]).trim() : 'outgoing';

      // Find Time
      const timeKey = Object.keys(allData).find(k => [
        'timestamp', 'time', 'date', 'created_at', 'call_time', 'calltime'
      ].includes(k.trim().toLowerCase()));
      const timestampRaw = timeKey ? String(allData[timeKey]).trim() : '';

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

      // Clean Duration: extract digits and decimal points (handles brackets/units like "[15s]")
      const durationCleaned = durationRaw.replace(/[^\d.]/g, '');
      const duration = Math.round(parseFloat(durationCleaned)) || 0;
      
      // Clean Phone Number
      const normalizedIncoming = rawPhone.replace(/\D/g, '');
      
      if (!normalizedIncoming || normalizedIncoming.length < 5) {
        console.log(`[SYNC] Invalid phone: ${rawPhone}`);
        results.push({ error: 'Invalid phone', rawPhone });
        continue;
      }

      // Validate and fallback dates when handling timestamps to prevent invalid date casting crashes
      let startedDate = new Date();
      if (timestampRaw && !timestampRaw.includes('[') && !timestampRaw.includes('time') && !timestampRaw.includes('date')) {
        const parsedDate = new Date(timestampRaw);
        if (!isNaN(parsedDate.getTime())) {
          startedDate = parsedDate;
        }
      }

      // Android Doze mode can delay Automate syncs by 10-30 minutes. Use a wide window.
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      // Find Leads: Optimize query to run at DB regex level, preventing Out-Of-Memory/Timeout on production data
      let matchingLeads: any[] = [];
      const digits = normalizedIncoming.replace(/\D/g, '');
      if (digits.length >= 5) {
        const lastDigits = digits.slice(-10);
        // Build regex matching each digit in sequence with optional non-digits in between (handles spaces/dashes in DB)
        const regexStr = lastDigits.split('').map((d, idx) => idx === lastDigits.length - 1 ? d : `${d}\\D*`).join('') + '$';
        const phoneRegex = new RegExp(regexStr);

        matchingLeads = await Lead.find({
          organizationId: user.organizationId,
          phone: { $regex: phoneRegex }
        });
      }

      // Fallback exact/substring match if regex search yielded nothing
      if (matchingLeads.length === 0 && normalizedIncoming.length >= 5) {
        matchingLeads = await Lead.find({
          organizationId: user.organizationId,
          $or: [
            { phone: normalizedIncoming },
            { phone: { $regex: new RegExp(normalizedIncoming.slice(-10) + '$') } }
          ]
        });
      }

      let lead = null;

      if (matchingLeads.length > 0) {
        // SMART LEAD DISAMBIGUATION
        // If multiple leads share a phone number, pick the one the user just called
        for (const mLead of matchingLeads) {
          const recentLog = await CallLog.findOne({
            leadId: mLead._id,
            salesPersonId: user._id,
            createdAt: { $gte: thirtyMinutesAgo },
            $or: [
              { syncId: 'BROWSER_TIMER' },
              { status: 'initiated' }
            ]
          });
          if (recentLog) {
            lead = mLead;
            console.log(`[SYNC] Disambiguated lead based on recent call: ${lead.name}`);
            break;
          }
        }
        
        if (!lead) {
          lead = matchingLeads[0];
        }
      } else {
        // PREDICTIVE MATCHING (Samsung bug fallback)
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const pendingCall = await CallLog.findOne({
          organizationId: user.organizationId,
          salesPersonId: user._id,
          createdAt: { $gte: twoMinutesAgo },
          $or: [
            { status: 'initiated' },
            { syncId: 'BROWSER_TIMER' }
          ]
        }).sort({ createdAt: -1 });

        if (pendingCall) {
          const matchedLead = await Lead.findById(pendingCall.leadId);
          if (matchedLead) {
            console.log(`[SYNC] Predictive Match: ${matchedLead.name}`);
            lead = matchedLead;
          }
        }
      }

      if (!lead) {
        console.log(`[SYNC] Lead not found for phone: ${normalizedIncoming}`);
        results.push({ status: 'ignored', message: 'Lead not found', phone: normalizedIncoming });
        continue;
      }

      // ────── UNIQUE ID & DEDUPLICATION ──────
      const syncId = body.syncId || body.id || `sync-${user._id}-${normalizedIncoming}-${duration}-${startedDate.getTime()}`;
      
      const existingActivity = await Activity.findOne({ syncId, organizationId: user.organizationId });
      if (existingActivity) {
        results.push({ status: 'duplicate', activityId: existingActivity._id });
        continue;
      }

      // ────── SMART CORRECTION (Overwrite Browser Timer if Smart Method was used) ──────

      // Find existing browser-placeholder Activity (any BROWSER_TIMER within 30 min for this lead+user)
      const activityToUpdate = await Activity.findOne({
        leadId: lead._id,
        createdBy: user._id,
        type: 'call',
        createdAt: { $gte: thirtyMinutesAgo },
        syncId: 'BROWSER_TIMER'
      }).sort({ createdAt: -1 });

      // Find existing browser-placeholder CallLog
      const callLogToUpdate = await CallLog.findOne({
        leadId: lead._id,
        salesPersonId: user._id,
        createdAt: { $gte: thirtyMinutesAgo },
        $or: [
          { syncId: 'BROWSER_TIMER' },
          { status: 'initiated' }
        ]
      }).sort({ createdAt: -1 });

      console.log(`[SYNC] Correction search results — activityToUpdate: ${activityToUpdate?._id || 'none'}, callLogToUpdate: ${callLogToUpdate?._id || 'none'}`);

      const callTypeLabel = typeRaw.toLowerCase().includes('incoming') ? 'Incoming' : 'Outgoing';
      let verifiedNotes = `✅ Verified ${callTypeLabel} Call. Duration: ${duration}s`;

      if (activityToUpdate || callLogToUpdate) {
        // Update existing browser placeholder records with hardware-verified data
        if (activityToUpdate) {
          activityToUpdate.duration = duration;
          activityToUpdate.notes = verifiedNotes;
          activityToUpdate.syncId = syncId;
          activityToUpdate.status = 'completed';
          activityToUpdate.completedAt = new Date();
          await activityToUpdate.save();
        } else if (callLogToUpdate) {
          // User initiated call via browser, but background sync arrived before they returned to CRM tab.
          // Create the verified activity since browser-end hasn't run.
          await Activity.create({
            organizationId: user.organizationId,
            leadId: lead._id,
            type: 'call',
            duration,
            syncId,
            notes: verifiedNotes,
            createdBy: user._id,
            status: 'completed',
            completedAt: new Date(),
            callLogId: callLogToUpdate._id
          });
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
        startedAt: startedDate,
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
        callLogId: newCallLog._id, // Add callLogId link
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
