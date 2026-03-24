-- RPC function to find user ID by email
-- This is needed for the ShareFile component to find recipient IDs
CREATE OR REPLACE FUNCTION get_user_by_email(email_input TEXT)
RETURNS TABLE (id UUID) AS $$
BEGIN
  RETURN QUERY SELECT users.id FROM auth.users WHERE users.email = email_input;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In a production Supabase environment, you may need to grant execute permissions
-- GRANT EXECUTE ON FUNCTION get_user_by_email(TEXT) TO authenticated;
