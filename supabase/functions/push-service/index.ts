import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// 🛡️ THE FIX: Declare Deno for the TypeScript compiler 
// This stops the "Cannot find name 'Deno'" error in Node environments.
declare const Deno: any;

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

/**
 * 🔔 PUSH NOTIFICATION SERVICE v2.1
 * Purpose: Secure server-side alerts for community engagement.
 * Environment: Deno / Supabase Edge Function.
 */
serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const { record, table } = payload;

    // Initialize Admin Client using Deno's native environment getter
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let targetUserId = null;
    let notificationTitle = "App Update";
    let notificationBody = "New activity on your profile.";
    let deepLinkData: Record<string, any> = { screen: 'activity' };

    // -------------------------------------------------------------------------
    // 🕒 1. AUTOMATED EXPIRY CHECK (CRON Path)
    // -------------------------------------------------------------------------
    if (payload.type === 'EXPIRY_CHECK') {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + 3);
      const dateString = targetDate.toISOString().split('T')[0];

      const { data: users } = await supabaseAdmin
        .from('profiles')
        .select('id, expo_push_token, subscription_plan')
        .gte('subscription_expiry', `${dateString}T00:00:00`)
        .lte('subscription_expiry', `${dateString}T23:59:59`);

      if (!users || users.length === 0) return new Response("No expirations found.");

      const messages = users
        .filter((u: any) => u.expo_push_token)
        .map((u: any) => ({
          to: u.expo_push_token,
          sound: 'default',
          title: 'Plan Expiring',
          body: `Your ${u.subscription_plan} plan expires in 3 days. Renew now to keep your shop active!`,
          data: { screen: 'seller/settings' }
        }));

      if (messages.length > 0) {
        await fetch(EXPO_PUSH_URL, { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(messages) 
        });
      }
      return new Response(`Notified ${messages.length} shop owners.`);
    }

    // -------------------------------------------------------------------------
    // 🔔 2. REAL-TIME DATABASE HOOKS
    // -------------------------------------------------------------------------
    
    // LIKE HANDSHAKE
    if (table === 'product_likes') {
      const { data: p } = await supabaseAdmin.from('products').select('seller_id, name').eq('id', record.product_id).single();
      targetUserId = p?.seller_id;
      notificationTitle = "✨ New Like";
      notificationBody = `Someone liked your item: ${p?.name}`;
      deepLinkData = { productId: record.product_id };
    }

    // COMMENT HANDSHAKE
    else if (table === 'product_comments') {
      const { data: p } = await supabaseAdmin.from('products').select('seller_id, name').eq('id', record.product_id).single();
      targetUserId = p?.seller_id;
      notificationTitle = "💬 New Comment";
      notificationBody = `Someone commented on your item: ${p?.name}`;
      deepLinkData = { productId: record.product_id };
    }

    // ORDER HANDSHAKE
    else if (table === 'orders') {
      targetUserId = record.seller_id;
      notificationTitle = "💰 New Order";
      notificationBody = `You have a new order! Tap to view details and chat with the buyer.`;
      deepLinkData = { screen: 'orders' };
    }

    // FOLLOW HANDSHAKE
    else if (table === 'follows') {
      targetUserId = record.following_id;
      const { data: f } = await supabaseAdmin.from('profiles').select('display_name, slug').eq('id', record.follower_id).single();
      notificationTitle = "👤 New Follower";
      notificationBody = `${f?.display_name || f?.slug || 'Someone'} started following you.`;
      deepLinkData = { screen: 'profile', userId: record.follower_id };
    }

    // -------------------------------------------------------------------------
    // 🚀 3. DISPATCH TO EXPO
    // -------------------------------------------------------------------------
    if (!targetUserId) return new Response("No target user found.");

    const { data: userProfile } = await supabaseAdmin
      .from('profiles')
      .select('expo_push_token')
      .eq('id', targetUserId)
      .single();

    if (!userProfile?.expo_push_token) return new Response("User has no push token.");

    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: userProfile.expo_push_token,
        sound: 'default',
        title: notificationTitle,
        body: notificationBody,
        data: deepLinkData,
      }),
    });

    return new Response(JSON.stringify({ sent: true }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    });

  } catch (error: any) {
    console.error("PUSH_SENTINEL_CRITICAL_FAILURE:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      headers: { "Content-Type": "application/json" },
      status: 500 
    });
  }
})