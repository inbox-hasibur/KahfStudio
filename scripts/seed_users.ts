import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const usersToCreate = [
  {
    email: 'hasibur@gmail.com',
    password: 'HR998877',
    role: 'user',
    tier: 'free',
    name: 'Hasibur Free'
  },
  {
    email: 'hasiburp@gmail.com',
    password: 'HR998877',
    role: 'user',
    tier: 'premium',
    name: 'Hasibur P Premium'
  },
  {
    email: 'admin@gmail.com',
    password: 'admin998877',
    role: 'admin',
    tier: 'premium',
    name: 'Admin User'
  },
  {
    email: 'premium@gmail.com',
    password: 'premium998877',
    role: 'user',
    tier: 'premium',
    name: 'Premium User'
  }
];

async function seedUsers() {
  for (const user of usersToCreate) {
    console.log(`Checking if ${user.email} exists...`);
    // Create user via admin API
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: {
        role: user.role,
        tier: user.tier,
        full_name: user.name
      }
    });

    if (error) {
      if (error.message.includes('already been registered')) {
        console.log(`User ${user.email} already exists. Attempting to update metadata...`);
        // We can't directly get user by email easily without listUsers, but we can assume it's fine
        // To be thorough, we can fetch the user ID
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = listData.users.find(u => u.email === user.email);
        if (existingUser) {
           await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
             user_metadata: {
               role: user.role,
               tier: user.tier,
               full_name: user.name
             }
           });
           console.log(`Updated metadata for ${user.email}`);
        }
      } else {
        console.error(`Failed to create ${user.email}:`, error.message);
      }
    } else {
      console.log(`Successfully created ${user.email}`);
    }
  }
  console.log('Seeding complete.');
}

seedUsers();
