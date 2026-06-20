import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env', 'utf-8').split('\n').reduce((acc, line) => {
  const [key, ...val] = line.split('=');
  if (key && val.length > 0) acc[key] = val.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {})

const SUPABASE_URL = env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function run() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'o.munoz.castro@gmail.com',
    password: '123456'
  })
  if (error) { console.error('login error:', error); return; }

  const { data: rpcData, error: rpcError } = await supabase.rpc('rpc_set_curso_colaboradores', {
    p_id_curso: 'fa7822dc-0c95-44b8-ba1b-f6df9fde555b',
    p_docente_ids: ['b24e4934-b5ff-4004-9851-1b68185a2230']
  })
  
  if (rpcError) {
    console.error('RPC Error:', rpcError)
  } else {
    console.log('RPC Success:', rpcData)
  }
}

run()
