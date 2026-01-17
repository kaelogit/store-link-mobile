// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const PAYSTACK_SECRET_KEY = Deno.env.get('PAYSTACK_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

/**
 * 🏰 PAYSTACK SECURE WEBHOOK v23.6 (Pure Build)
 * Audited: Section I Identity Upgrades & Section VI Economic Logging.
 */
serve(async (req) => {
  try {
    const signature = req.headers.get('x-paystack-signature');
    const body = await req.text();

    // 🛡️ SECURITY PROTOCOL: HMAC Signature Validation
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
      return new Response('Unauthorized Signature', { status: 401 });
    }

    const event = JSON.parse(body);

    if (event.event === 'charge.success') {
      const { metadata, amount, reference } = event.data;
      
      if (!metadata?.profile_id || !metadata?.plan_type) {
        throw new Error("Missing Identity Metadata");
      }

      const { profile_id, plan_type } = metadata;
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);

      // 🏛️ PRESTIGE WEIGHT MAPPING (Manifest v76.0)
      const prestigeWeight = plan_type === 'diamond' ? 3 : 2;

      // 🛡️ ATOMIC SUBSCRIPTION UPDATE
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          subscription_plan: plan_type,
          prestige_weight: prestigeWeight, // 💎 Priority slot unlock
          subscription_expiry: expiry.toISOString(),
          subscription_status: 'active',
          is_seller: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile_id);

      if (profileError) throw profileError;

      // 📊 ECONOMIC LEDGER (Section VI)
      await supabase.from('transactions').insert({
        owner_id: profile_id,
        amount: amount / 100, // Paystack kobo to Naira
        plan_type: plan_type,
        status: 'success',
        reference: reference,
        type: 'SUBSCRIPTION_UPGRADE'
      });

      console.log(`✅ PRESTIGE UPGRADE: User ${profile_id} is now ${plan_type} (Weight ${prestigeWeight})`);
      return new Response(JSON.stringify({ status: 'Success' }), { status: 200 });
    }

    return new Response('Event Acknowledged', { status: 200 });
  } catch (error) {
    console.error('🏢 WEBHOOK ERROR:', error.message);
    return new Response(error.message, { status: 400 });
  }
})