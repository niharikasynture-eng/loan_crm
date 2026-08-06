import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import Lead from './src/models/Lead';
import { enrichLeadData } from './src/lib/lead-enrichment';

async function testEnrichment() {
  const uri = process.env.MONGODB_URI || 'mongodb://chinmaybelpatre_db_user:mPbSdJZln4dvmiGP@ac-n4eyjzn-shard-00-00.rivhc9u.mongodb.net:27017,ac-n4eyjzn-shard-00-01.rivhc9u.mongodb.net:27017,ac-n4eyjzn-shard-00-02.rivhc9u.mongodb.net:27017/?ssl=true&replicaSet=atlas-j7am4w-shard-0&authSource=admin&appName=Cluster0';
  await mongoose.connect(uri);

  // 1. Create a test corporate lead if none exists with email
  let lead = await Lead.findOne({ email: { $exists: true, $ne: '' } });
  
  if (!lead) {
    console.log('Creating test corporate lead...');
    const org = await mongoose.model('Organization').findOne({});
    lead = await Lead.create({
      organizationId: org._id,
      name: 'John Smith',
      email: 'john.smith@microsoft.com',
      phone: '9876543210',
      source: 'Website',
      status: 'new',
      pipelineStage: 'new',
      createdBy: org._id,
    });
  } else {
    // Ensure email has domain for test
    if (!lead.email || !lead.email.includes('@')) {
      lead.email = 'sarah.connor@stripe.com';
      await lead.save();
    }
  }

  console.log(`Testing Auto-Data Enrichment for Lead: "${lead.name}" (${lead.email})...`);
  const enriched = await enrichLeadData(lead._id.toString());

  console.log('--- ENRICHED LEAD RESULT ---');
  console.log({
    id: enriched?._id,
    name: enriched?.name,
    email: enriched?.email,
    company: enriched?.company,
    jobTitle: enriched?.jobTitle,
    industry: enriched?.industry,
    companySize: enriched?.companySize,
    companyRevenue: enriched?.companyRevenue,
    linkedinUrl: enriched?.linkedinUrl,
    isEnriched: enriched?.isEnriched,
  });

  process.exit();
}

testEnrichment();
