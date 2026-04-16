const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://chinmaybelpatre_db_user:mPbSdJZln4dvmiGP@cluster0.rivhc9u.mongodb.net/?appName=Cluster0').then(async () => {
    const Activity = mongoose.model('Activity', new mongoose.Schema({ notes: String, type: String, leadId: mongoose.Schema.Types.ObjectId, createdAt: Date, callLogId: mongoose.Schema.Types.ObjectId }, { strict: false }));
    const acts = await Activity.find({ type: 'call' }).sort({ createdAt: -1 }).limit(10);
    console.log(acts.map(a => ({ id: a._id, notes: a.notes, createdAt: a.createdAt, callLogId: a.callLogId })));
    process.exit();
}).catch(console.error);
