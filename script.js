const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://chinmaybelpatre_db_user:mPbSdJZln4dvmiGP@cluster0.rivhc9u.mongodb.net/?appName=Cluster0').then(async () => {
    const Activity = mongoose.model('Activity', new mongoose.Schema({ notes: String, type: String, callLogId: mongoose.Schema.Types.ObjectId, syncId: String }, { strict: false }));
    const acts = await Activity.find({ type: 'call', callLogId: { $ne: null } });
    let updated = 0;
    for (const act of acts) {
        if (act.notes && act.notes.startsWith('✅ Verified') && !act.notes.includes('Smart App:')) {
            act.notes = act.notes.replace('✅ Verified', '✅ Smart App: Verified');
            await act.save();
            updated++;
        }
    }
    
    // Also patch anything that says Browser Timer directly
    const acts2 = await Activity.find({ type: 'call', notes: /Browser Timer/ });
    for (const act of acts2) {
        if (!act.notes.includes('Smart App:')) {
            const raw = act.notes;
            const match = raw.match(/Duration: (\d+)s/);
            const dur = match ? match[1] : '0';
            act.notes = '\u2705 Smart App: Verified Outgoing Call. Duration: ' + dur + 's';
            await act.save();
            updated++;
        }
    }
    console.log('Migrated ' + updated + ' activities.');
    process.exit();
}).catch(console.error);
