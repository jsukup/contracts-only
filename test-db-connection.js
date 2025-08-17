const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jrdwwhwckbkplnnalhox.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpyZHd3aHdja2JrcGxubmFsaG94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUzMjI3NzYsImV4cCI6MjA3MDg5ODc3Nn0.dllKacvhtu6BVjoh6fKNswajdUugaSY_1-RHLN-GfAs';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabase client created successfully');
console.log('Testing connection...');

async function testConnection() {
  const { data, error } = await supabase.from('_prisma_migrations').select('*').limit(1);
  if (error) {
    console.log('Note: Table might not exist yet, which is expected:', error.message);
  } else {
    console.log('Connection successful!');
  }
}

testConnection();
