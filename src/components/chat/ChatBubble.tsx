import React from 'react';
import { StyleSheet, Image, Dimensions } from 'react-native';
import { format } from 'date-fns';
import { Check, CheckCheck, Diamond as DiamondIcon } from 'lucide-react-native';

// 🏛️ Sovereign Components
import { View, Text } from '../Themed';
import { useUserStore } from '../../store/useUserStore';
import Colors from '../../constants/Colors';import { useColorScheme } from '../useColorScheme';

const { width } = Dimensions.get('window');

interface ChatBubbleProps {
  message: any;
  isDiamond?: boolean;
}

/**
 * 🏰 CHAT BUBBLE v90.1 (Pure Build)
 * Audited: Section I Visual Immunity & Section VII Messaging Governance.
 */
export const ChatBubble = ({ message, isDiamond }: ChatBubbleProps) => {
  const { profile: currentUser } = useUserStore();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const isMe = message.sender_id === currentUser?.id;

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
        (!isMe && isDiamond) && styles.diamondBubble
      ]}>
        
        {/* 🖼️ IMAGE TRANSMISSION */}
        {message.image_url && (
          <Image 
            source={{ uri: message.image_url }} 
            style={styles.attachedImage} 
            resizeMode="cover"
          />
        )}

        {/* 📝 TEXT SIGNAL */}
        {message.text ? (
          <Text style={[
            styles.messageText,
            isMe ? styles.myText : { color: theme.text }
          ]}>
            {message.text}
          </Text>
        ) : null}

        {/* 🏛️ BUBBLE FOOTER: TIME & STATUS */}
        <View style={[styles.footer, { backgroundColor: 'transparent' }]}>
           {(!isMe && isDiamond) && (
             <DiamondIcon size={8} color="#8B5CF6" fill="#8B5CF6" style={{ marginRight: 4 }} />
           )}
           <Text style={[
             styles.timeText,
             isMe ? styles.myTime : { color: theme.subtext }
           ]}>
             {format(new Date(message.created_at), 'HH:mm')}
           </Text>
           
           {isMe && (
             <View style={[styles.statusIcon, { backgroundColor: 'transparent' }]}>
               {message.is_read ? (
                 <CheckCheck size={12} color={Colors.brand.emerald} strokeWidth={3} />
               ) : (
                 <Check size={12} color={message.is_optimistic ? theme.subtext : "white"} strokeWidth={3} />
               )}
             </View>
           )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 4,
    flexDirection: 'row',
  },
  alignRight: { justifyContent: 'flex-end' },
  alignLeft: { justifyContent: 'flex-start' },
  
  bubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden'
  },
  myBubble: {
    backgroundColor: '#111827', // Empire Onyx Constant
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    borderBottomLeftRadius: 4,
  },
  diamondBubble: {
    backgroundColor: '#F5F3FF', // prestige_weight: 3 Visual Immunity
    borderWidth: 1,
    borderColor: '#EDE9FE',
  },
  optimisticBubble: {
    opacity: 0.6,
  },

  attachedImage: {
    width: width * 0.65,
    height: width * 0.65,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#222'
  },

  messageText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  myText: { color: 'white' },

  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 4
  },
  timeText: {
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  myTime: { color: 'rgba(255,255,255,0.5)' },
  
  statusIcon: {
    marginLeft: 2,
  }
});