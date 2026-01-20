import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * 🏰 MONEY NOTIFICATIONS v1.0
 * Triggers: Payout Successful, Refund Issued (Buyer), Refund Notif (Seller).
 */
serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { type, userId, amount, orderId } = await req.json();

  // 1. Fetch User's Push Token
  const { data: user } = await supabase
    .from('profiles')
    .select('push_token, display_name')
    .eq('id', userId)
    .single();

  if (!user?.push_token) return new Response("No token found");

  let title = "";
  let body = "";

  // 2. Logic for Different Money Events
  switch (type) {
    case 'PAYOUT_SUCCESS':
      title = "💰 MONEY SENT TO BANK";
      body = `Success! ₦${amount.toLocaleString()} has been transferred to your bank for Order #${orderId.slice(0,8)}.`;
      break;
    
    case 'REFUND_BUYER':
      title = "🔙 REFUND SUCCESSFUL";
      body = `₦${amount.toLocaleString()} has been sent back to your original payment method for Order #${orderId.slice(0,8)}.`;
      break;

    case 'REFUND_SELLER_ALERT':
      title = "⚠️ ORDER REFUNDED";
      body = `Order #${orderId.slice(0,8)} was refunded. ₦${amount.toLocaleString()} has been returned to the buyer.`;
      break;
  }

  // 3. Send via Expo Push Service
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: user.push_token,
      title: title,
      body: body,
      sound: 'default',
      data: { orderId, type },
    }),
  });

  return new Response("Notification sent");
})