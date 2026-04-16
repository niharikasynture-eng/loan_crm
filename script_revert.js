const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://chinmaybelpatre_db_user:mPbSdJZln4dvmiGP@cluster0.rivhc9u.mongodb.net/?appName=Cluster0').then(async () => {
    const Activity = mongoose.model('Activity', new mongoose.Schema({ notes: String, type: String }, { strict: false }));
    
    const acts = await Activity.find({ type: 'call', notes: /Smart App: Verified/ });
    let updated = 0;
    for (const act of acts) {
        act.notes = act.notes.replace('Smart App: Verified', 'Verified');
        await act.save();
        updated++;
    }
    
    console.log('Reverted ' + updated + ' activities back to standard Verified format.');
    process.exit();
}).catch(console.error);
