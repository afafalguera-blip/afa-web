import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://zaxbtnjkidqwzqsehvld.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpheGJ0bmpraWRxd3pxc2VodmxkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMjc2NTMsImV4cCI6MjA3MzYwMzY1M30.9MNjQdeLvW_UaxZz0XQmR6jQSakzF-UzBWvdboWWHRg";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
