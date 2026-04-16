const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://chinmaybelpatre_db_user:mPbSdJZln4dvmiGP@cluster0.rivhc9u.mongodb.net/?appName=Cluster0').then(async () => {
    const CallLog = mongoose.model('CallLog', new mongoose.Schema({ status: String, syncId: String, leadId: mongoose.Schema.Types.ObjectId, endedAt: Date, duration: Number, salesPersonId: mongoose.Schema.Types.ObjectId, organizationId: mongoose.Schema.Types.ObjectId, createdAt: Date }, { strict: false }));
    const Activity = mongoose.model('Activity', new mongoose.Schema({ notes: String, type: String, callLogId: mongoose.Schema.Types.ObjectId, syncId: String, leadId: mongoose.Schema.Types.ObjectId, createdBy: mongoose.Schema.Types.ObjectId, completedAt: Date }, { strict: false }));
    
    // Find all completed call logs
    const callLogs = await CallLog.find({ status: 'completed' });
    let created = 0;
    
    for (const log of callLogs) {
        if (!log.endedAt || !log.duration || !log.leadId) continue;

        // Find if activity exists for this callLogId OR same syncId
        const act = await Activity.findOne({ 
            $or: [
                { callLogId: log._id },
                { syncId: log.syncId, type: 'call', leadId: log.leadId }
            ]
        });
        
        if (!act) {
            // Check if there's any activity around the same time for the same lead
            const fiveMinsAfter = new Date(log.endedAt.getTime() + 5 * 60000);
            const fiveMinsBefore = new Date(log.endedAt.getTime() - 5 * 60000);
            const nearbyAct = await Activity.findOne({
                type: 'call',
                leadId: log.leadId,
                completedAt: { $gte: fiveMinsBefore, $lte: fiveMinsAfter }
            });
            
            if (!nearbyAct) {
                await Activity.create({
                    organizationId: log.organizationId,
                    leadId: log.leadId,
                    type: 'call',
                    duration: log.duration,
                    syncId: log.syncId,
                    notes: '\u2705 Verified Outgoing Call. Duration: ' + log.duration + 's',
                    createdBy: log.salesPersonId,
                    status: 'completed',
                    completedAt: log.endedAt,
                    createdAt: log.createdAt,
                    callLogId: log._id
                });
                created++;
            }
        }
    }
    console.log('Restored ' + created + ' missing activities from call logs.');
    process.exit();
}).catch(console.error);
