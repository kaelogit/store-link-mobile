import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * 🔥 TRENDING ALERTS v1.0
 * Purpose: Detects high-traffic products and notifies the seller.
 * Trigger: 50+ unique views in 24 hours.
 */
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const today = new Date().toISOString().split('T')[0];

  // 1. Identify items with 50+ unique views today
  const { data: hotItems, error } = await supabase.rpc('get_trending_products', { 
    view_threshold: 50,
    target_date: today 
  });

  if (error || !hotItems) return new Response("No trending items today.");

  const notifications = [];

  for (const item of hotItems) {
    if (!item.push_token) continue;

    notifications.push({
      to: item.push_token,
      title: "🔥 YOUR ITEM IS TRENDING!",
      body: `Your '${item.product_name}' has received ${item.view_count} views today. It's hot! ⚡`,
      sound: 'default',
      data: { screen: 'ProductDetails', productId: item.product_id },
    });
  }

  // 2. Send via Expo
  if (notifications.length > 0) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notifications),
    });
  }

  return new Response(`Alerted ${notifications.length} sellers about trending items.`);
})