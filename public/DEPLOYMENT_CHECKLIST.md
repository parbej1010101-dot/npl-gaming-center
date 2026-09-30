# NPL Gaming Center — exact next steps

1. Create Supabase project.
2. Run `supabase/migrations/001_init.sql` in SQL Editor.
3. Copy Project URL + Publishable Key into `public/config.js`.
4. Enable Email Auth.
5. Configure Google OAuth if you want Google login.
6. Configure an SMS provider if you want phone OTP.
7. Install Supabase CLI in your development environment.
8. Login to Supabase CLI and link this project.
9. Set `OPENAI_API_KEY` as an Edge Function secret.
10. Deploy `supabase/functions/ai-chat`.
11. Open the frontend and test:
   - account creation
   - login
   - tournament creation
   - tournament join
   - points deduction
   - realtime refresh
   - AI assistant

Never put a secret API key in `public/config.js`.
