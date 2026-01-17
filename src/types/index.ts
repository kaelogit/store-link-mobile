/**
 * 🏰 STORELINK GLOBAL TYPES v80.0
 * Fixed: Removed 'username' and established 'slug' as the primary handle.
 * Language: Cleaned up terminology for better developer clarity.
 */

export interface Profile {
  id: string;
  email: string | null;
  slug: string | null;          // 🛡️ THE HANDLE (Replaced username)
  display_name: string | null;   // Brand or Shop Name
  full_name: string | null;
  logo_url: string | null;       
  cover_image_url: string | null; 
  bio: string | null;
  category: string | null;       
  gender?: 'male' | 'female' | 'other' | null;
  
  handle_last_changed_at?: string | null;
  location_last_changed_at?: string | null;
  // Location & Prestige
  location: string | null;       
  subscription_plan: 'none' | 'standard' | 'diamond';
  prestige_weight: 1 | 2 | 3;    // 1=None, 2=Standard, 3=Diamond
  is_verified: boolean;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  
  // Contact & Support
  whatsapp_number: string | null; 
  phone_number: string | null;
  is_store_open: boolean;
  
  // Shop & Account Status
  is_seller: boolean;
  onboarding_completed: boolean;
  seller_trial_ends_at?: string;
  subscription_expiry?: string;
  
  // Coins & Economy
  coin_balance: number;          
  loyalty_enabled?: boolean;
  loyalty_percentage?: number;
  
  // Social Stats & Privacy
  is_wardrobe_private: boolean;
  follower_count: number;        
  following_count: number;       
  wardrobe_count: number;        
  updated_at?: string;
  created_at?: string;

  // Verification Documents
  verification_doc_url?: string;
  verification_selfie_url?: string;
}

export interface Product {
  id: string;
  seller_id: string; 
  name: string;
  description: string | null;
  price: number;
  stock_quantity: number;
  image_urls: string[];
  image_ratio: number;           // Standard 1.25 ratio
  category: string;
  is_active: boolean;            
  is_flash_drop: boolean;
  likes_count: number;
  comments_count: number;
  seller?: Partial<Profile>; 
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;               // Buyer ID
  seller_id: string;             // Merchant ID
  total_amount: number;
  coin_redeemed: number;         
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  delivery_address: string;
  created_at: string;
  items?: OrderItem[];
  buyer?: Partial<Profile>;
  seller?: Partial<Profile>;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: Partial<Product>;
}

/** Coin Transactions */
export interface CoinTransaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'EARN' | 'SPEND' | 'REFUND' | 'ADJUSTMENT';
  reference_id?: string;
  transaction_hash: string;      
  created_at: string;
}

/** Social Connections */
export interface Follow {
  follower_id: string; 
  seller_id: string;   
  created_at: string;
}

export interface Reel {
  id: string;
  seller_id: string;
  video_url: string;
  product_id: string | null;
  duration: number;
  created_at: string;
}

export interface Story {
  id: string;
  seller_id: string;
  media_url: string;
  type: 'image' | 'video';
  linked_product_id: string | null;
  expires_at: string;            // 12-Hour Lifespan
  created_at: string;
}

/** Dynamic Stats View */
export interface ProfileStats {
  primaryLabel: 'FOLLOWERS' | 'FOLLOWING'; 
  primaryValue: number;
  secondaryLabel: 'DROPS' | 'WARDROBE';    
  secondaryValue: number;
}

/** Simplified Seller for Cart Logic */
export interface SellerMinimal {
  id: string;
  display_name: string | null;
  logo_url: string | null;
}