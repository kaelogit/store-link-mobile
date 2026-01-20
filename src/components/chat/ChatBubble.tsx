import React from 'react';
import { StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { format } from 'date-fns';
import { Check, CheckCheck, Gem, ShoppingBag, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image'; // 🛠️ FIXED: High-Fidelity Image

// App Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';

const { width } = Dimensions.get('window');

interface ChatBubbleProps {
  message: any;
  isDiamond?: boolean;
  isMe?: boolean; // 🛠️ FIXED: Added prop definition
}

/**
 * 🏰 CHAT BUBBLE v92.0
 * Purpose: Displays messages between buyers and sellers.
 * Features: Automatically detects "Order Messages" and displays them as mini-receipts.
 * Visual: Distinct styles for 'me' vs 'them' and special highlights for Diamond sellers.
 */
export const ChatBubble = ({ message, isDiamond, isMe }: ChatBubbleProps) => {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  // 🛠️ FIXED: Standardized Message Types
  const isOrderSystemMessage = message.type === 'SYSTEM_ORDER';
  const isImageMessage = message.type === 'image' || message.type === 'IMAGE';
  const content = message.content || message.text; // Fallback for legacy

  return (
    <View style={[
      styles.container, 
      isMe ? styles.alignRight : styles.alignLeft,
      { backgroundColor: 'transparent' }
    ]}>
      <View style={[
        styles.bubble,
        isMe ? styles.myBubble : [styles.theirBubble, { backgroundColor: theme.surface }],
        message.is_optimistic && styles.optimisticBubble,
        (!isMe && isDiamond) && styles.diamondBubble, // 💎 THE GLOW
        isOrderSystemMessage && styles.orderBubble
      ]}>
        
        {/* 🛍️ ORDER RECEIPT VIEW: Triggered by the "Wired" Checkout Hook */}
        {isOrderSystemMessage ? (
          <TouchableOpacity 
            onPress={() => router.push(`/orders/${message.data?.orderId}`)}
            activeOpacity={0.8}
            style={styles.orderContent}
          >
            <View style={styles.orderHeader}>
              <ShoppingBag size={18} color={isMe ? "white" : theme.text} />
              <Text style={[styles.orderTitle, { color: isMe ? "white" : theme.text }]}>NEW ORDER</Text>
            </View>
            <Text style={[styles.orderText, { color: isMe ? "rgba(255,255,255,0.8)" : theme.subtext }]}>
              {content}
            </Text>
            <View style={[styles.viewOrderBtn, { backgroundColor: isMe ? "rgba(255,255,255,0.1)" : theme.background }]}>
              <Text style={[styles.viewOrderText, { color: isMe ? "white" : theme.text }]}>VIEW DETAILS</Text>
              <ChevronRight size={14} color={isMe ? "white" : theme.text} />
            </View>
          </TouchableOpacity>
        ) : (
          <>
            {/* 🖼️ ATTACHED IMAGES */}
            {isImageMessage && content && (
              <Image 
                source={{ uri: content }} 
                style={styles.attachedImage} 
                contentFit="cover"
                transition={200}
              />
            )}

            {/* 📝 REGULAR TEXT */}
            {!isImageMessage && content ? (
              <Text style={[
                styles.messageText,
                isMe ? styles.myText : { color: theme.text },
                (!isMe && isDiamond) && { color: '#4C1D95' } // Dark Violet Text for Diamond Messages
              ]}>
                {content}
              </Text>
            ) : null}
          </>
        )}

        {/* 🕒 TIME & STATUS */}
        <View style={[styles.footer, { backgroundColor: 'transparent' }]}>
           {(!isMe && isDiamond) && (
             <Gem size={8} color="#8B5CF6" fill="#8B5CF6" style={{ marginRight: 4 }} />
           )}
           <Text style={[
             styles.timeText,
             isMe ? styles.myTime : { color: theme.subtext },
             (!isMe && isDiamond) && { color: '#8B5CF6' }
           ]}>
             {format(new Date(message.created_at), 'HH:mm')}
           </Text>
           
           {isMe && (
             <View style={[styles.statusIcon, { backgroundColor: 'transparent' }]}>
               {message.is_read ? (
                 <CheckCheck size={12} color={Colors.brand.emerald} strokeWidth={3} />
               ) : (
                 <Check size={12} color={message.is_optimistic ? "rgba(255,255,255,0.4)" : "white"} strokeWidth={3} />
               )}
             </View>
           )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', paddingHorizontal: 16, marginVertical: 4, flexDirection: 'row' },
  alignRight: { justifyContent: 'flex-end' },
  alignLeft: { justifyContent: 'flex-start' },
  
  bubble: { maxWidth: width * 0.75, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, overflow: 'hidden' },
  myBubble: { backgroundColor: '#111827', borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4 },
  
  // 💎 DIAMOND STATUS STYLING
  diamondBubble: { 
    backgroundColor: '#F5F3FF', 
    borderWidth: 1, 
    borderColor: '#8B5CF6',
    shadowColor: "#8B5CF6",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  
  orderBubble: { padding: 16, minWidth: width * 0.6 },
  optimisticBubble: { opacity: 0.6 },
  
  attachedImage: { width: width * 0.65, height: width * 0.8, borderRadius: 14, marginBottom: 8, backgroundColor: '#f0f0f0' },
  
  messageText: { fontSize: 14, fontWeight: '600', lineHeight: 20 },
  myText: { color: 'white' },
  
  orderContent: { gap: 10 },
  orderHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  orderTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  orderText: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  viewOrderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, marginTop: 4 },
  viewOrderText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4 },
  timeText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase' },
  myTime: { color: 'rgba(255,255,255,0.5)' },
  statusIcon: { marginLeft: 2 }
});