import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Find orders ready for payout (1 hour has passed AND not already processing/paid)
  const { data: eligibleOrders } = await supabase
    .from('orders')
    .select('*, merchant:seller_id(bank_details)')
    .eq('status', 'completed')
    .in('payout_status', ['pending', 'retry_queued']) // Now includes retries
    .lte('payout_eligible_at', new Date().toISOString());

  if (!eligibleOrders || eligibleOrders.length === 0) return new Response("No payouts due");

  for (const order of eligibleOrders) {
    const bank = order.merchant.bank_details;
    
    // Safety Check: If no bank details, mark as failed for support team to see
    if (!bank?.recipientCode) {
      await supabase.from('orders').update({ payout_status: 'failed' }).eq('id', order.id);
      continue;
    }

    // 2. TRIGGER PAYSTACK TRANSFER
    const response = await fetch('https://api.paystack.co/transfer', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: "balance",
        amount: Math.floor(order.total_amount * 100), // Ensure it's an integer for kobo
        recipient: bank.recipientCode,
        reason: `Payout for Order #${order.id.slice(0,8)}`
      })
    });

    const result = await response.json();

    if (response.ok) {
      // ✅ SUCCESS: Update to PAID
      await supabase.from('orders').update({ 
        payout_status: 'paid',
        payout_error_log: null 
      }).eq('id', order.id);
    } else {
      // ❌ FAILURE LOGIC
      const isInsufficientBalance = result.message?.toLowerCase().includes('balance');

      if (isInsufficientBalance) {
        // ⏳ RETRY SHIELD: Move the payout_eligible_at time forward by 1 hour
        await supabase.from('orders').update({ 
          payout_status: 'retry_queued',
          payout_eligible_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // +1 Hour
          payout_error_log: 'Insufficient Paystack Balance - Retrying in 1 hour'
        }).eq('id', order.id);
      } else {
        // 🚨 HARD FAIL: Other issues (invalid bank, etc.) - require support
        await supabase.from('orders').update({ 
          payout_status: 'failed',
          payout_error_log: result.message 
        }).eq('id', order.id);
      }
    }
  }

  return new Response("Batch processed");
})