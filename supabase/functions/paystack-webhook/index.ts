// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * 🏰 PAYSTACK WEBHOOK v24.0
 * Purpose: Securely receives payment confirmations from Paystack to upgrade user accounts.
 * Features: Secure identity check, automatic profile upgrades, and instant push notifications.
 */
serve(async (req) => {
  try {
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();

    // 🛡️ IDENTITY CHECK: Verifies that this data actually came from Paystack.
    const encoder = new TextEncoder();
    const keyData = encoder.encode(PAYSTACK_SECRET_KEY);
    const key = await crypto.subtle.importKey(
      "raw", keyData, { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    );
    const signatureBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (signature !== expectedSignature) {
      return new Response('Unauthorized Access', { status: 401 });
    }

    const event = JSON.parse(body);

    // Only process successful payments
    if (event.event === 'charge.success') {
      const { metadata, amount, reference } = event.data;
      
      if (!metadata?.profile_id || !metadata?.plan_type) {
        throw new Error("Payment metadata missing.");
      }

      const { profile_id, plan_type } = metadata;
      
      // Calculate 30-day expiration date
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);

      // Determine account level (Level 3 for Diamond, Level 2 for Standard)
      const prestigeWeight = plan_type === 'diamond' ? 3 : 2;

      // 1. UPDATE PROFILE: Grant the user their new store features.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          subscription_plan: plan_type,
          prestige_weight: prestigeWeight, 
          subscription_expiry: expiry.toISOString(),
          subscription_status: 'active',
          is_seller: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile_id);

      if (profileError) throw profileError;

      // 2. SAVE TRANSACTION: Record the payment in the database.
      await supabase.from('transactions').insert({
        owner_id: profile_id,
        amount: amount / 100, // Convert Kobo back to Naira
        plan_type: plan_type,
        status: 'success',
        reference: reference,
        type: 'SUBSCRIPTION_UPGRADE'
      });

      // 3. SEND NOTIFICATION: Alert the user that their account is active.
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/push-service`, {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            },
            body: JSON.stringify({ 
                table: 'profiles', 
                type: 'SUBSCRIPTION_ACTIVE',
                record: { 
                    id: profile_id, 
                    plan: plan_type.toUpperCase() 
                } 
            }),
        });
      } catch (pushErr) {
        console.error("Notification delivery failed, but account was upgraded.");
      }

      console.log(`✅ ACCOUNT UPGRADED: ${profile_id} is now ${plan_type}`);
      return new Response(JSON.stringify({ status: 'Success' }), { status: 200 });
    }

    return new Response('Event Received', { status: 200 });
  } catch (error) {
    return new Response(error.message, { status: 400 });
  }
})