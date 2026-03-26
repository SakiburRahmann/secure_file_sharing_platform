"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

export async function createUserProfile(profileData: {
  id: string;
  public_key: string;
  encrypted_private_key: string;
  key_iv: string;
  key_salt: string;
}) {
  try {
    const { error } = await supabaseAdmin.from("profiles").insert(profileData);
    if (error) {
      console.error("Profile creation error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
