import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  StyleSheet, FlatList, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  Image, ActivityIndicator, Modal, Dimensions
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { 
  ArrowLeft, Send, ShoppingBag, MoreVertical, 
  User, BellOff, ShieldAlert, Trash2, 
  Zap, DollarSign, ExternalLink
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Ecosystem
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 CHAT SCREEN v95.0
 * Fixed: Replaced username with slug in participant queries.
 * Language: Simplified terminology for human clarity.
 */
export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { profile: currentUser } = useUserStore();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [thread, setThread] = useState<any>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    fetchChatData();
    const channel = subscribeToMessages();
    
    return () => { 
      isMounted.current = false;
      supabase.removeChannel(channel); 
    };
  }, [id]);

  const fetchChatData = async () => {
    try {
      // 🛡️ DATA FIX: username -> slug
      const { data: threadData, error: threadError } = await supabase
        .from('conversations')
        .select(`
          *, 
          product:product_id(id, name, price, image_urls), 
          seller:participant_one(id, slug, display_name, logo_url, subscription_plan, prestige_weight), 
          buyer:participant_two(id, slug, display_name, logo_url)
        `)
        .eq('id', id)
        .single();
      
      if (threadError) throw threadError;
      if (isMounted.current) setThread(threadData);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', id)
        .order('created_at', { ascending: true });
      
      if (isMounted.current) setMessages(msgs || []);
    } catch (e) {
      console.error("Chat sync failed:", e);
      router.back();
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  const subscribeToMessages = () => {
    return supabase
      .channel(`thread_live_${id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages', 
        filter: `thread_id=eq.${id}` 
      }, (payload) => {
        if (isMounted.current) {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      })
      .subscribe();
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !currentUser) return;
    
    const messageContent = input.trim();
    const tempId = Math.random().toString();
    setInput('');
    setSending(true);
    
    // Optimistic UI for instant feedback
    const tempMsg = {
      id: tempId,
      content: messageContent,
      sender_id: currentUser.id,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const { error } = await supabase.from('messages').insert({
      thread_id: id,
      sender_id: currentUser.id,
      content: messageContent
    });

    if (error && isMounted.current) {
      setMessages(prev => prev.filter(m => m.id !== tempId)); 
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    if (isMounted.current) setSending(false);
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
      <Text style={[styles.loadingText, { color: theme.subtext }]}>LOADING CHAT...</Text>
    </View>
  );

  const isMeParticipantOne = thread?.participant_one === currentUser?.id;
  const partner = isMeParticipantOne ? thread.buyer : thread.seller;
  const isDiamond = partner?.subscription_plan === 'diamond' || partner?.prestige_weight === 3;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
      >
        {/* HEADER */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.headerPartner} 
            onPress={() => router.push(`/profile/${partner.id}`)}
          >
            <View style={[styles.avatarBorder, isDiamond && { borderWidth: 2, borderColor: '#8B5CF6' }]}>
               <Image 
                source={{ uri: partner.logo_url || 'https://via.placeholder.com/150' }} 
                style={styles.headerAvatar} 
               />
            </View>
            <View style={{ marginLeft: 12 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.headerName, { color: theme.text }]}>{(partner.display_name || partner.slug || 'User').toUpperCase()}</Text>
                {isDiamond && <Zap size={10} color="#8B5CF6" fill="#8B5CF6" />}
              </View>
              <Text style={[styles.headerStatus, { color: theme.subtext }]}>{isDiamond ? 'Diamond Member' : 'Member'}</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setShowOptions(true)} style={styles.optionsBtn}>
            <MoreVertical color={theme.text} size={20} />
          </TouchableOpacity>
        </View>

        {/* PRODUCT CONTEXT */}
        {thread?.product && (
          <View style={[styles.contextCard, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
            <Image source={{ uri: thread.product.image_urls[0] }} style={styles.contextImg} />
            <View style={{ flex: 1 }}>
              <Text style={styles.contextLabel}>DISCUSSING PRODUCT</Text>
              <Text style={[styles.contextName, { color: theme.text }]}>{thread.product.name.toUpperCase()}</Text>
              <Text style={styles.contextPrice}>₦{thread.product.price.toLocaleString()}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.buyBtn, { backgroundColor: theme.text }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)}
            >
              <DollarSign size={14} color={theme.background} />
              <Text style={[styles.buyBtnText, { color: theme.background }]}>OFFER</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* MESSAGES LIST */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isMe = item.sender_id === currentUser?.id;
            return (
              <View style={[styles.bubbleWrapper, isMe ? styles.myWrapper : styles.theirWrapper]}>
                <View style={[
                  styles.bubble, 
                  isMe ? { backgroundColor: theme.text } : { backgroundColor: theme.surface },
                  isMe ? styles.myBubble : styles.theirBubble
                ]}>
                  <Text style={[
                    styles.bubbleText, 
                    isMe ? { color: theme.background } : { color: theme.text }
                  ]}>
                    {item.content}
                  </Text>
                </View>
                <Text style={[styles.timeText, { color: theme.subtext }]}>
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true }).toUpperCase()}
                </Text>
              </View>
            );
          }}
        />

        {/* INPUT BOX */}
        <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
          <TouchableOpacity style={styles.attachBtn}>
             <ShoppingBag size={20} color={theme.subtext} />
          </TouchableOpacity>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Type a message..."
            placeholderTextColor={theme.subtext}
            value={input}
            onChangeText={setInput}
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: theme.text }, !input.trim() && styles.sendDisabled]} 
            onPress={handleSend}
            disabled={!input.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color={theme.background} /> : <Send size={18} color={theme.background} strokeWidth={2.5} />}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* OPTIONS MODAL */}
      <Modal visible={showOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <View style={[styles.optionsSheet, { backgroundColor: theme.background }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            <Text style={styles.sheetTitle}>OPTIONS</Text>
            
            <OptionItem icon={User} label="View Profile" color={theme.text} onPress={() => { setShowOptions(false); router.push(`/profile/${partner.id}`); }} />
            <OptionItem icon={ExternalLink} label="Share Contact" color={theme.text} onPress={() => {}} />
            <OptionItem icon={BellOff} label="Mute Chat" color={theme.text} onPress={() => {}} />
            
            <View style={[styles.sheetDivider, { backgroundColor: theme.surface }]} />
            
            <OptionItem icon={ShieldAlert} label="Report User" color="#EF4444" onPress={() => {}} />
            <OptionItem icon={Trash2} label="Delete Chat" color="#EF4444" onPress={() => {}} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const OptionItem = ({ icon: Icon, label, onPress, color }: any) => (
  <TouchableOpacity style={styles.optionItem} onPress={onPress}>
    <Icon size={20} color={color} />
    <Text style={[styles.optionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, paddingTop: Platform.OS === 'ios' ? 60 : 45, borderBottomWidth: 1 },
  backBtn: { padding: 5 },
  headerPartner: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
  avatarBorder: { padding: 2, borderRadius: 18 },
  headerAvatar: { width: 42, height: 42, borderRadius: 16 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerName: { fontSize: 13, fontWeight: '900', letterSpacing: -0.2 },
  headerStatus: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  optionsBtn: { padding: 5 },
  contextCard: { flexDirection: 'row', padding: 18, borderBottomWidth: 1.5, alignItems: 'center', gap: 14 },
  contextImg: { width: 54, height: 64, borderRadius: 14, backgroundColor: '#E5E7EB' },
  contextLabel: { fontSize: 8, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1, marginBottom: 2 },
  contextName: { fontSize: 13, fontWeight: '900' },
  contextPrice: { fontSize: 12, fontWeight: '800', color: '#10B981', marginTop: 2 },
  buyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 15 },
  buyBtnText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  listContent: { padding: 20, paddingBottom: 40 },
  bubbleWrapper: { marginBottom: 20, maxWidth: '85%' },
  myWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { padding: 16, borderRadius: 24 },
  myBubble: { borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  timeText: { fontSize: 8, fontWeight: '900', marginTop: 6, letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', padding: 20, alignItems: 'center', gap: 12, borderTopWidth: 1, paddingBottom: Platform.OS === 'ios' ? 40 : 20 },
  attachBtn: { padding: 8 },
  input: { flex: 1, borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, fontSize: 15, fontWeight: '600', maxHeight: 120, borderWidth: 1 },
  sendBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { opacity: 0.2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  optionsSheet: { borderTopLeftRadius: 45, borderTopRightRadius: 45, padding: 30, paddingBottom: 50 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 25 },
  sheetTitle: { fontSize: 11, fontWeight: '900', color: '#9CA3AF', letterSpacing: 2, textAlign: 'center', marginBottom: 25 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: 15 },
  optionLabel: { fontSize: 15, fontWeight: '900' },
  sheetDivider: { height: 1, marginVertical: 10 }
});