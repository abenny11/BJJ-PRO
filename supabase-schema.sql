-- BJJ-PRO Supabase Schema
-- Run this in the Supabase SQL Editor to set up the database.

-- Coaches table
CREATE TABLE coaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL UNIQUE, -- Supabase Auth user ID
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Athletes table
CREATE TABLE athletes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL REFERENCES coaches(uid),
  athlete_uid TEXT, -- Supabase Auth user ID (optional)
  name TEXT NOT NULL,
  access_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  user_data JSONB NOT NULL DEFAULT '{}'
);

-- Exercises table
CREATE TABLE exercises (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Upper Push', 'Upper Pull', 'Lower Body')),
  type TEXT NOT NULL CHECK (type IN ('FIXO', 'VARIAVEL')),
  video_url TEXT,
  coach_id TEXT NOT NULL REFERENCES coaches(uid),
  group_id TEXT,
  sub_exercises JSONB
);

-- Exercise groups table
CREATE TABLE exercise_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id TEXT NOT NULL REFERENCES coaches(uid),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_groups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for coaches
CREATE POLICY "Coaches can read own profile" ON coaches FOR SELECT USING (uid = auth.uid()::text);
CREATE POLICY "Coaches can insert own profile" ON coaches FOR INSERT WITH CHECK (uid = auth.uid()::text);
CREATE POLICY "Coaches can update own profile" ON coaches FOR UPDATE USING (uid = auth.uid()::text);

-- RLS Policies for athletes
CREATE POLICY "Coaches can manage their athletes" ON athletes FOR ALL USING (coach_id = auth.uid()::text);
CREATE POLICY "Public read by access_code" ON athletes FOR SELECT USING (true); -- Athletes access by code

-- RLS Policies for exercises
CREATE POLICY "Anyone can read exercises" ON exercises FOR SELECT USING (true);
CREATE POLICY "Coaches can manage own exercises" ON exercises FOR ALL USING (coach_id = auth.uid()::text);

-- RLS Policies for exercise_groups
CREATE POLICY "Anyone can read exercise groups" ON exercise_groups FOR SELECT USING (true);
CREATE POLICY "Coaches can manage own groups" ON exercise_groups FOR ALL USING (coach_id = auth.uid()::text);
