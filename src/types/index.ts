/**
 * 🏰 GLOBAL TYPE DEFINITIONS v87.0
 * Purpose: Centralizes all data structures for the 2026 StoreLink Engine.
 * Features: Unified Subscription, Payout Engine, Story discovery, and Social Analytics.
 */

export interface Profile {
  id: string;
  email: string | null;
  slug: string | null;           // @username or @brandname
  display_name: string | null;   // Store Name
  full_name: string | null;
  logo_url: string | null;       
  cover_image_url: string | null; 
  bio: string | null;
  category: string | null;       
  gender?: 'male' | 'female' | 'other' | null;
  location?: string; 
  trial_ends_at?: string; 
  last_seen_at?: string;         // 🆕 Pulse "Active Now" logic
  
  // 🛡️ VIEW CONTEXT (High-End State Management)
  view_as: 'buyer' | 'seller';   // Determines UI layout context
  
  // NOTIFICATIONS & MESSAGING
  push_token: string | null;      
  unread_messages_count?: number; 
  
  // TIME TRACKING
  handle_last_changed_at?: string | null;
  location_last_changed_at?: string | null;
  
  // DISCOVERY & LEVEL
  location_state: string | null; // e.g., "Lagos"
  location_city: string | null;  // e.g., "Lekki"
  subscription_plan: 'none' | 'standard' | 'diamond';
  prestige_weight: 1 | 2 | 3;    // 1=None, 2=Standard, 3=Diamond
  is_verified: boolean;          // Email status
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'; // ID status
  
  // CONTACT INFO
  whatsapp_number: string | null; 
  phone_number: string | null;
  is_store_open: boolean;
  
  // STORE STATUS
  is_seller: boolean;
  onboarding_completed: boolean;
  subscription_expiry?: string;  
  subscription_status?: 'active' | 'expired' | 'trial' | 'trialing';  

  // 🏦 FINANCIAL & BANKING
  escrow_balance: number;        
  bank_name?: string;            
  bank_code?: string;
  account_number?: string;
  account_name?: string;
  bank_details?: {               
    bank_name: string;
    account_number: string;
    account_name: string;
  };

  // REWARDS & COINS
  coin_balance: number;          
  loyalty_enabled?: boolean;
  loyalty_percentage?: number;
  
  // SOCIAL STATS
  follower_count: number;        
  following_count: number;       
  wardrobe_count: number;        
  is_wardrobe_private: boolean;
  updated_at?: string;
  created_at?: string;
}

export interface Product {
  id: string;
  seller_id: string; 
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_urls: string[];
  image_ratio: number;           // Standard 1.25 (4:5)
  category: string;
  is_active: boolean;            
  is_flash_drop: boolean;        // Urgent/limited sale
  likes_count: number;
  comments_count: number;
  view_count?: number;           // "Hot Item" logic
  is_liked?: boolean;            
  is_saved?: boolean;            // For wishlist checks
  seller?: Partial<Profile>;     
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;               // Buyer ID
  seller_id: string;             // Seller ID
  total_amount: number;
  coin_redeemed: number;         
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'completed' | 'cancelled';
  delivery_address: string;
  payment_reference?: string;    // Paystack Reference
  
  // 🆕 LOGISTICS (Added for Merchant Terminal)
  tracking_number?: string;
  courier_name?: string;
  estimated_delivery_at?: string;

  // 💰 PAYOUT ENGINE
  payout_eligible_at?: string;   // The 1-hour escrow timer
  payout_status?: 'pending' | 'retry_queued' | 'paid' | 'failed';
  payout_error_log?: string;     

  // 🔗 CONNECTIONS
  chat_id?: string;              
  created_at: string;
  updated_at: string;
  
  items?: OrderItem[];
  order_items?: OrderItem[];     // Joined alias
  
  buyer?: Partial<Profile>;
  seller?: Partial<Profile>;
  merchant?: Partial<Profile>;   // Component alias
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  qty: number;                   
  unit_price: number;
  product?: Partial<Product>;
}

export interface CashTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'PAYOUT' | 'REFUND' | 'ESCROW_RELEASE' | 'INTERNAL_TRANSFER';
  status: 'pending' | 'completed' | 'failed';
  reference_id: string;          
  created_at: string;
}

export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'EARN' | 'SPEND' | 'REFUND' | 'ADJUSTMENT';
  reference_id?: string;         
  transaction_hash: string;      
  created_at: string;
}

export interface ProfileView {
  id: string;
  viewer_id: string;
  profile_id: string;
  view_date: string;            
  created_at: string;
  sender?: Partial<Profile>;    
}

export interface Follow {
  follower_id: string; 
  following_id: string;          
  created_at: string;
  sender?: Partial<Profile>;    
}

/** 💬 MESSAGING SYSTEM */
export interface Chat {
  id: string;
  buyer_id: string;
  seller_id: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
  buyer?: Partial<Profile>;
  seller?: Partial<Profile>;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  type: 'text' | 'image' | 'product' | 'order';
  metadata?: any;
  created_at: string;
}

/** 🎥 IMMERSIVE CONTENT */
export interface Reel {
  id: string;
  seller_id: string;
  video_url: string;
  thumbnail_url: string;
  product_id: string | null;
  caption?: string;
  likes_count: number;
  comments_count: number;
  is_liked?: boolean;
  is_saved?: boolean;
  created_at: string;
  seller?: Partial<Profile>;
  product?: Partial<Product>;
}

export interface Story {
  id: string;
  seller_id: string;
  media_url: string;
  type: 'image' | 'video';
  linked_product_id?: string;
  likes_count: number;
  created_at: string;
  seller?: Partial<Profile>;
  product?: Partial<Product>;
}

export interface Notification {
  id: string;
  target_user_id: string;
  sender_id?: string;
  type: 'LIKE' | 'COMMENT' | 'ORDER' | 'FOLLOW' | 'SYSTEM' | 'URGENT' | 'MONEY' | 'VIEW';
  content: string;
  is_read: boolean;
  data?: any;                    
  created_at: string;
  sender?: Partial<Profile>;     
}

export interface SellerMinimal {
  id: string;
  display_name: string | null;
  logo_url: string | null;
  subscription_plan?: 'none' | 'standard' | 'diamond';
}