const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not set. Skipping table creation.');
  process.exit(0);
}

if (supabaseUrl.includes('localhost')) {
  console.error('NEXT_PUBLIC_SUPABASE_URL should not point to localhost. Please set a valid Supabase URL.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function initDatabase() {
  try {
    // Create profiles table
    const createProfiles = `
      CREATE TABLE IF NOT EXISTS profiles (
        id UUID REFERENCES auth.users(id) PRIMARY KEY,
        nome TEXT,
        email TEXT,
        role TEXT DEFAULT 'irmao',
        cargo TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await supabase.rpc('exec_sql', { sql: createProfiles });

    // Create presencas table
    const createPresencas = `
      CREATE TABLE IF NOT EXISTS presencas (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES profiles(id),
        data DATE,
        presente BOOLEAN,
        hora_marcacao TIMESTAMP WITH TIME ZONE,
        latitude NUMERIC,
        longitude NUMERIC,
        metodo TEXT,
        observacoes TEXT,
        criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    await supabase.rpc('exec_sql', { sql: createPresencas });

    // Create indexes
    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_presencas_user_id ON presencas(user_id);
      CREATE INDEX IF NOT EXISTS idx_presencas_data ON presencas(data);
    `;
    await supabase.rpc('exec_sql', { sql: createIndexes });

    console.log('Database tables created successfully.');
  } catch (error) {
    console.error('Error creating tables:', error);
  }
}

initDatabase();