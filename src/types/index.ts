/**
 * 🏰 GLOBAL TYPE DEFINITIONS v82.0
 * Purpose: Centralizes all data structures for the application.
 * Features: Definitions for User Profiles, Products, Orders, and Social interactions.
 */

export interface Profile {
  id: string;
  email: string | null;
  slug: string | null;           // @username or @brandname
  display_name: string | null;    // Store Name
  full_name: string | null;
  logo_url: string | null;       
  cover_image_url: string | null; 
  bio: string | null;
  category: string | null;       
  gender?: 'male' | 'female' | 'other' | null;
  location?: string; 
  trial_ends_at?: string; 
  
  // NOTIFICATIONS
  expo_push_token: string | null; // Token for mobile alerts
  
  // TIME TRACKING
  handle_last_changed_at?: string | null;
  location_last_changed_at?: string | null;
  
  // DISCOVERY & LEVEL
  location_state: string | null; // e.g., "Lagos"
  location_city: string | null;  // e.g., "Lekki"
  subscription_plan: 'none' | 'standard' | 'diamond';
  prestige_weight: 1 | 2 | 3;    // Store Level: 1=None, 2=Standard, 3=Diamond
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
  is_liked?: boolean;            
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
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  buyer?: Partial<Profile>;
  seller?: Partial<Profile>;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  qty: number;                   
  unit_price: number;
  product?: Partial<Product>;
}

/** 📊 COIN HISTORY */
export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'EARN' | 'SPEND' | 'REFUND' | 'ADJUSTMENT';
  reference_id?: string;         // Linked Order ID
  transaction_hash: string;      
  created_at: string;
}

/** 🛰️ CONNECTIONS */
export interface Follow {
  follower_id: string; 
  following_id: string;          
  created_at: string;
}

export interface Notification {
  id: string;
  target_user_id: string;
  sender_id?: string;
  type: 'LIKE' | 'COMMENT' | 'ORDER' | 'FOLLOW' | 'SYSTEM' | 'URGENT';
  content: string;
  is_read: boolean;
  data?: any;                    // Metadata for app routing
  created_at: string;
}

/** 🎥 MEDIA CONTENT */
export interface Reel {
  id: string;
  seller_id: string;
  video_url: string;
  thumbnail_url: string;
  product_id: string | null;
  duration: number;
  likes_count: number;
  created_at: string;
}

export interface Story {
  id: string;
  seller_id: string;
  media_url: string;
  type: 'image' | 'video';
  linked_product_id: string | null;
  expires_at: string;            // Auto-delete timestamp
  created_at: string;
}

/** 🏛️ BASIC INFO */
export interface SellerMinimal {
  id: string;
  display_name: string | null;
  logo_url: string | null;
  subscription_plan?: string;
}