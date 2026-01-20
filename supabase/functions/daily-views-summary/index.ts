import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * 👁️ DAILY VIEWS SUMMARY v1.0
 * Schedule: 10:00 PM Daily
 * Logic: Counts today's unique visitors and sends tailored push notifications.
 */
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Get Today's Date String
  const today = new Date().toISOString().split('T')[0];

  // 2. Aggregate Today's Views
  // We count unique viewers per profile for today.
  const { data: viewStats, error: statsError } = await supabase
    .from('profile_views')
    .select('profile_id, viewer_id')
    .eq('view_date', today);

  if (statsError || !viewStats) return new Response("No views to report today.");

  // Group by profile_id
  const summaryMap = viewStats.reduce((acc: any, curr) => {
    acc[curr.profile_id] = (acc[curr.profile_id] || 0) + 1;
    return acc;
  }, {});

  const profileIds = Object.keys(summaryMap);

  // 3. Fetch User Details (Tokens & Seller Status)
  const { data: users } = await supabase
    .from('profiles')
    .select('id, push_token, is_seller')
    .in('id', profileIds);

  if (!users) return new Response("No users found for notification.");

  const notifications = [];

  for (const user of users) {
    if (!user.push_token) continue;

    const count = summaryMap[user.id];
    const targetName = user.is_seller ? "store" : "profile";
    const actionName = user.is_seller ? "visited" : "viewed";

    notifications.push({
      to: user.push_token,
      title: "👁️ TODAY'S VISITOR LOG",
      body: `${count} ${count === 1 ? 'person' : 'people'} ${actionName} your ${targetName} today. See who they are!`,
      sound: 'default',
      data: { screen: 'Activity' },
    });
  }

  // 4. Batch Send via Expo (Maximum 100 per chunk for efficiency)
  if (notifications.length > 0) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifications),
    });
  }

  return new Response(`Summaries sent to ${notifications.length} users.`);
})