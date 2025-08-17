const { Client } = require('pg');

async function testConnections() {
  const configs = [
    {
      name: 'Direct to Supabase host',
      connectionString: 'postgresql://postgres:ZulF4HKFPylig5vs@db.jrdwwhwckbkplnnalhox.supabase.co:5432/postgres'
    },
    {
      name: 'Pooler with postgres.project format',
      connectionString: 'postgresql://postgres.jrdwwhwckbkplnnalhox:ZulF4HKFPylig5vs@aws-0-us-west-1.pooler.supabase.com:5432/postgres'
    },
    {
      name: 'Pooler US East',
      connectionString: 'postgresql://postgres.jrdwwhwckbkplnnalhox:ZulF4HKFPylig5vs@aws-0-us-east-1.pooler.supabase.com:5432/postgres'
    }
  ];

  for (const config of configs) {
    console.log(`\nTesting: ${config.name}`);
    const client = new Client({ connectionString: config.connectionString });
    
    try {
      await client.connect();
      const res = await client.query('SELECT NOW()');
      console.log(`✅ Success! Server time: ${res.rows[0].now}`);
      await client.end();
    } catch (err) {
      console.log(`❌ Failed: ${err.message}`);
    }
  }
}

testConnections().catch(console.error);