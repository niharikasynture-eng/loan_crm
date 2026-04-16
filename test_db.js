const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://chinmaybelpatre_db_user:mPbSdJZln4dvmiGP@cluster0.rivhc9u.mongodb.net/?appName=Cluster0').then(async () => {
    const Activity = mongoose.model('Activity', new mongoose.Schema({ notes: String, type: String, leadId: mongoose.Schema.Types.ObjectId, createdAt: Date, callLogId: mongoose.Schema.Types.ObjectId, organizationId: mongoose.Schema.Types.ObjectId, createdBy: mongoose.Schema.Types.ObjectId, status: String, completedAt: Date, duration: Number }, { strict: false }));
    try {
        const doc = await Activity.create({
            organizationId: new mongoose.Types.ObjectId(),
            leadId: new mongoose.Types.ObjectId(),
            type: 'call',
            notes: '? Verified Outgoing Call. Duration: 5s',
            duration: 5,
            callLogId: new mongoose.Types.ObjectId(),
            createdBy: new mongoose.Types.ObjectId(),
            status: 'completed',
            completedAt: new Date()
        });
        console.log('Success:', doc._id);
    } catch(err) {
        console.error('Error:', err.message);
    }
    process.exit();
}).catch(console.error);
