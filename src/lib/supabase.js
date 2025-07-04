// src/lib/supabase.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "SUPABASE_PROJECT_URL";
const supabaseKey = "SUPABASE_ANON_KEY";

export const supabase = createClient(supabaseUrl, supabaseKey);

// Storage bucket name for parking documents
export const PARKING_DOCUMENTS_BUCKET = "parking-documents";
