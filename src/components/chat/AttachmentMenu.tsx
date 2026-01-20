import React from 'react';
import { StyleSheet, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Image as ImageIcon, Eye, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// App Components
import { View, Text } from '../Themed';
import Colors from '../../constants/Colors';
import { useColorScheme } from '../useColorScheme';

interface AttachmentMenuProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectOption: (type: 'REGULAR' | 'VIEW_ONCE') => void;
}

/**
 * 🏰 ATTACHMENT MENU v1.0
 * Purpose: Provides a clear choice between standard and private photo sharing.
 * Logic: Simple bottom-sheet overlay with tactile haptic feedback.
 */
export const AttachmentMenu = ({ isVisible, onClose, onSelectOption }: AttachmentMenuProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];

  const handleSelection = (type: 'REGULAR' | 'VIEW_ONCE') => {
    Haptics.selectionAsync();
    onSelectOption(type);
    onClose();
  };

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.text }]}>SEND PHOTO</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={theme.subtext} />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            {/* OPTION 1: REGULAR PHOTO */}
            <TouchableOpacity 
              style={[styles.option, { backgroundColor: theme.surface }]}
              onPress={() => handleSelection('REGULAR')}
            >
              <View style={[styles.iconBox, { backgroundColor: Colors.brand.emerald + '15' }]}>
                <ImageIcon size={22} color={Colors.brand.emerald} />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>Standard Photo</Text>
                <Text style={[styles.optionSub, { color: theme.subtext }]}>Stays in the chat history</Text>
              </View>
            </TouchableOpacity>

            {/* OPTION 2: VIEW ONCE PHOTO */}
            <TouchableOpacity 
              style={[styles.option, { backgroundColor: theme.surface }]}
              onPress={() => handleSelection('VIEW_ONCE')}
            >
              <View style={[styles.iconBox, { backgroundColor: '#8B5CF615' }]}>
                <Eye size={22} color="#8B5CF6" />
              </View>
              <View style={styles.textContainer}>
                <Text style={[styles.optionTitle, { color: theme.text }]}>View Once Photo</Text>
                <Text style={[styles.optionSub, { color: theme.subtext }]}>Disappears after opening</Text>
              </View>
            </TouchableOpacity>
          </View>

        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 25, paddingBottom: 50 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  title: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  closeBtn: { padding: 5 },
  optionsContainer: { gap: 12 },
  option: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 24, gap: 15 },
  iconBox: { width: 50, height: 50, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  textContainer: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700' },
  optionSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
});