import React, { useState } from 'react';
import { 
  StyleSheet, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator,
  Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Components
import { View } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';

interface MessageInputProps {
  onSend: (text: string) => void;
  onImagePick: () => void;
  isLoading?: boolean;
}

/**
 * 🏰 MESSAGE INPUT v1.1
 * Purpose: The primary interface for buyer-seller communication.
 * Logic: Auto-expanding text field with hardware haptic feedback.
 * Hardware: Optimized for bottom-screen reachability and thumb ergonomics.
 */
export const MessageInput = ({ onSend, onImagePick, isLoading }: MessageInputProps) => {
  const [text, setText] = useState('');
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];

  const handleSend = () => {
    if (text.trim().length === 0 || isLoading) return;
    
    // Physical feedback upon transmission
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSend(text.trim());
    setText('');
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.background, 
        borderTopColor: theme.border,
        paddingBottom: Math.max(insets.bottom, 15) // 🛡️ Safe Area Dynamic Padding
      }
    ]}>
      <View style={styles.contentRow}>
        
        {/* MEDIA ATTACHMENT */}
        <TouchableOpacity 
          onPress={() => {
            Haptics.selectionAsync();
            onImagePick();
          }}
          style={[styles.iconBtn, { backgroundColor: theme.surface }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Plus color={theme.text} size={20} strokeWidth={2.5} />
        </TouchableOpacity>

        {/* TEXT INPUT ENGINE */}
        <View style={[styles.inputWrapper, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.subtext}
            multiline
            maxLength={1000}
            value={text}
            onChangeText={setText}
            textAlignVertical="center" // Android Fix
          />
        </View>

        {/* SEND ACTION */}
        <TouchableOpacity 
          onPress={handleSend}
          disabled={text.trim().length === 0 || isLoading}
          style={[
            styles.sendBtn, 
            { backgroundColor: text.trim().length > 0 ? theme.text : theme.surface }
          ]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={theme.background} />
          ) : (
            <Send 
              size={18} 
              color={text.trim().length > 0 ? theme.background : theme.subtext} 
              strokeWidth={3} 
              style={{ marginLeft: 2 }} // Optical adjustment
            />
          )}
        </TouchableOpacity>

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1, // Thinner, cleaner border
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: 'transparent'
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22, // Perfectly circular
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'android' ? 2 : 8, // Tighter on Android
    justifyContent: 'center'
  },
  input: {
    fontSize: 15,
    fontWeight: '600',
    paddingTop: 0, 
    paddingBottom: 0,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});