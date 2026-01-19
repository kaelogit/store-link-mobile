import React, { useState, useEffect, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { 
  StyleSheet, FlatList, TextInput, 
  TouchableOpacity, KeyboardAvoidingView, Platform, 
  ActivityIndicator, Modal, Dimensions, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
  ArrowLeft, Send, ShoppingBag, MoreVertical, 
  User, BellOff, ShieldAlert, Trash2, 
  Zap, DollarSign, Gem, 
  CheckCircle2, Truck, PackageCheck, Circle,
  UserX
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

// Ecosystem
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

const { width } = Dimensions.get('window');

/**
 * 🏰 CHAT & DEAL HUB v100.0
 * Purpose: Secure messaging and order tracking.
 * Features: "Active Now" pulse, simplified order HUD, real-time sync.
 */
export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile: currentUser } = useUserStore();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [thread, setThread] = useState<any>(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [dealLoading, setDealLoading] = useState(false);
  
  const flatListRef = useRef<FlatList>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    fetchChatData();
    const channel = subscribeToThread();
    return () => { 
      isMounted.current = false; 
      supabase.removeChannel(channel); 
    };
  }, [id]);

  /** 📡 DATA LOAD */
  const fetchChatData = async () => {
    try {
      const { data: threadData, error: threadError } = await supabase
        .from('conversations')
        .select(`
          *, 
          product:product_id(id, name, price, image_urls), 
          seller:participant_one(id, slug, display_name, logo_url, subscription_plan, last_seen_at), 
          buyer:participant_two(id, slug, display_name, logo_url, last_seen_at)
        `)
        .eq('id', id).single();
      
      if (threadError) throw threadError;
      if (isMounted.current) setThread(threadData);

      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('thread_id', id)
        .order('created_at', { ascending: true });
      
      if (isMounted.current) setMessages(msgs || []);
    } catch (e) { 
      router.back(); 
    } finally { 
      if (isMounted.current) setLoading(false); 
    }
  };

  /** ⚡ REAL-TIME SYNC */
  const subscribeToThread = () => {
    return supabase.channel(`thread_live_${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `thread_id=eq.${id}` }, (payload) => {
        if (isMounted.current) {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'conversations', filter: `id=eq.${id}` }, (payload) => {
        if (isMounted.current) setThread((prev: any) => ({ ...prev, ...payload.new }));
      })
      .subscribe();
  };

  /** 🛡️ STATUS LOGIC: Calculates if partner is "Active Now" */
  const getPartnerStatus = () => {
    const partner = thread?.participant_one === currentUser?.id ? thread.buyer : thread.seller;
    if (!partner?.last_seen_at) return null;
    
    const lastSeen = new Date(partner.last_seen_at).getTime();
    const now = new Date().getTime();
    const diffInMinutes = (now - lastSeen) / (1000 * 60);

    if (diffInMinutes < 5) {
      return (
        <View style={styles.statusRow}>
          <Circle size={6} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
          <Text style={[styles.statusText, { color: Colors.brand.emerald }]}>Active now</Text>
        </View>
      );
    }

    return (
      <Text style={[styles.lastSeenText, { color: theme.subtext }]}>
        Active {formatDistanceToNow(new Date(partner.last_seen_at), { addSuffix: true })}
      </Text>
    );
  };

  const updateOrderProgress = async (newStatus: string) => {
    setDealLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const { error } = await supabase.from('conversations').update({ 
        deal_status: newStatus, 
        deal_updated_at: new Date().toISOString() 
      }).eq('id', id);
      
      if (error) throw error;
      
      await supabase.from('messages').insert({
        thread_id: id,
        sender_id: currentUser?.id,
        content: `📦 ORDER UPDATE: ${newStatus.toUpperCase()}`,
        is_system: true 
      });
    } catch (e) { 
      Alert.alert("Error", "Could not update order status."); 
    } finally { 
      setDealLoading(false); 
    }
  };

  const handleSend = async () => {
    if (!input.trim() || sending || !currentUser) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await supabase.from('messages').insert({ thread_id: id, sender_id: currentUser.id, content });
    if (isMounted.current) setSending(false);
  };

  if (loading) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
      <Text style={[styles.loadingText, { color: theme.subtext }]}>SECURE CONNECTION...</Text>
    </View>
  );

  const isMeSeller = thread?.participant_one === currentUser?.id;
  const partner = isMeSeller ? thread.buyer : thread.seller;
  const partnerIsDiamond = partner?.subscription_plan === 'diamond';
  const dealStatus = thread.deal_status || 'pending';

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* 🏰 HEADER */}
        <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + 10 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={theme.text} size={24} strokeWidth={2.5} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.headerPartner} onPress={() => router.push(`/profile/${partner.id}`)}>
            <View style={[styles.avatarBorder, partnerIsDiamond && styles.diamondHalo]}>
               <Image 
                source={partner.logo_url} 
                style={styles.headerAvatar} 
                contentFit="cover"
                transition={200}
               />
            </View>
            <View style={{ marginLeft: 12 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.headerName, { color: theme.text }]}>{(partner.display_name || partner.slug).toUpperCase()}</Text>
                {partnerIsDiamond && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" />}
              </View>
              {getPartnerStatus()}
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={() => setShowOptions(true)} style={styles.optionsBtn}>
            <MoreVertical color={theme.text} size={20} />
          </TouchableOpacity>
        </View>

        {/* 🛡️ ORDER STATUS HUD */}
        <View style={[styles.dealHud, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.dealInfo}>
            <Text style={styles.dealLabel}>ORDER PROGRESS</Text>
            <Text style={[styles.dealStatusText, { color: theme.text }]}>{dealStatus.toUpperCase()}</Text>
          </View>
          
          <View style={styles.dealActions}>
            {dealStatus === 'pending' && (
              <TouchableOpacity style={[styles.dealActionBtn, { backgroundColor: theme.text }]} onPress={() => updateOrderProgress('confirmed')}>
                <DollarSign size={14} color={theme.background} />
                <Text style={[styles.dealActionText, { color: theme.background }]}>PAID</Text>
              </TouchableOpacity>
            )}
            {dealStatus === 'confirmed' && isMeSeller && (
              <TouchableOpacity style={[styles.dealActionBtn, { backgroundColor: Colors.brand.emerald }]} onPress={() => updateOrderProgress('delivered')}>
                <Truck size={14} color="#FFF" />
                <Text style={[styles.dealActionText, { color: "#FFF" }]}>SHIPPED</Text>
              </TouchableOpacity>
            )}
            {dealStatus === 'delivered' && !isMeSeller && (
              <TouchableOpacity style={[styles.dealActionBtn, { backgroundColor: Colors.brand.emerald }]} onPress={() => updateOrderProgress('completed')}>
                <PackageCheck size={14} color="#FFF" />
                <Text style={[styles.dealActionText, { color: "#FFF" }]}>RECEIVED</Text>
              </TouchableOpacity>
            )}
            {dealStatus === 'completed' && (
              <View style={styles.completedTag}>
                <CheckCircle2 size={16} color={Colors.brand.emerald} />
                <Text style={styles.completedTagText}>CLOSED</Text>
              </View>
            )}
          </View>
        </View>

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
            const isSystem = item.is_system;

            if (isSystem) {
              return (
                <View style={styles.systemMsgContainer}>
                  <View style={[styles.systemLine, { backgroundColor: theme.border }]} />
                  <Text style={[styles.systemText, { color: theme.subtext }]}>{item.content}</Text>
                  <View style={[styles.systemLine, { backgroundColor: theme.border }]} />
                </View>
              );
            }

            return (
              <View style={[styles.bubbleWrapper, isMe ? styles.myWrapper : styles.theirWrapper]}>
                <View style={[
                  styles.bubble, 
                  isMe ? { backgroundColor: theme.text } : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 },
                  isMe ? styles.myBubble : styles.theirBubble
                ]}>
                  <Text style={[styles.bubbleText, isMe ? { color: theme.background } : { color: theme.text }]}>
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
        <View style={[styles.inputContainer, { borderTopColor: theme.border, backgroundColor: theme.background, paddingBottom: insets.bottom + 10 }]}>
          <TouchableOpacity style={styles.attachBtn} onPress={() => Haptics.selectionAsync()}>
             <ShoppingBag size={22} color={theme.subtext} />
          </TouchableOpacity>
          <TextInput 
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
            placeholder="Type a message..." placeholderTextColor={theme.subtext}
            value={input} onChangeText={setInput} multiline
          />
          <TouchableOpacity 
            style={[styles.sendBtn, { backgroundColor: theme.text }, !input.trim() && styles.sendDisabled]} 
            onPress={handleSend} disabled={!input.trim() || sending}
          >
            {sending ? <ActivityIndicator size="small" color={theme.background} /> : <Send size={20} color={theme.background} strokeWidth={2.5} />}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>

      {/* OPTIONS MODAL */}
      <Modal visible={showOptions} transparent animationType="fade">
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowOptions(false)}>
          <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={[styles.optionsSheet, { backgroundColor: theme.background }]}>
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />
            <Text style={styles.sheetTitle}>CHAT CONTROLS</Text>
            
            <OptionItem icon={User} label="View Profile" color={theme.text} onPress={() => { setShowOptions(false); router.push(`/profile/${partner.id}`); }} />
            <OptionItem icon={BellOff} label="Mute Notifications" color={theme.text} onPress={() => setShowOptions(false)} />
            <View style={styles.sheetDivider} />
            <OptionItem icon={UserX} label="Block User" color="#EF4444" onPress={() => { setShowOptions(false); Alert.alert("Block User?", "They will no longer be able to message you."); }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const OptionItem = ({ icon: Icon, label, onPress, color }: any) => (
  <TouchableOpacity style={styles.optionItem} onPress={onPress}>
    <Icon size={20} color={color} strokeWidth={2.5} />
    <Text style={[styles.optionLabel, { color }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 15, borderBottomWidth: 1.5 },
  backBtn: { padding: 5 },
  headerPartner: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
  avatarBorder: { padding: 2, borderRadius: 18 },
  diamondHalo: { borderColor: '#8B5CF6', borderWidth: 2 },
  headerAvatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#eee' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerName: { fontSize: 13, fontWeight: '900', letterSpacing: -0.2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  statusText: { fontSize: 10, fontWeight: '800' },
  lastSeenText: { fontSize: 10, fontWeight: '600', opacity: 0.6, marginTop: 2 },
  optionsBtn: { padding: 5 },
  // HUD
  dealHud: { padding: 18, borderBottomWidth: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dealInfo: { flex: 1 },
  dealLabel: { fontSize: 8, fontWeight: '900', color: '#9CA3AF', letterSpacing: 1.5 },
  dealStatusText: { fontSize: 13, fontWeight: '900', marginTop: 4 },
  dealActions: { flexDirection: 'row', gap: 10 },
  dealActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14 },
  dealActionText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  completedTag: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  completedTagText: { fontSize: 10, fontWeight: '900', color: '#10B981' },
  // List
  listContent: { padding: 20, paddingBottom: 40 },
  bubbleWrapper: { marginBottom: 22, maxWidth: '85%' },
  myWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  bubble: { padding: 16, borderRadius: 24 },
  myBubble: { borderBottomRightRadius: 4 },
  theirBubble: { borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, fontWeight: '500', lineHeight: 22 },
  timeText: { fontSize: 8, fontWeight: '900', marginTop: 8, letterSpacing: 0.5, opacity: 0.5 },
  systemMsgContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 35, gap: 15, paddingHorizontal: 20 },
  systemLine: { flex: 1, height: 1, opacity: 0.2 },
  systemText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center' },
  // Input
  inputContainer: { flexDirection: 'row', padding: 18, alignItems: 'center', gap: 12, borderTopWidth: 1.5 },
  attachBtn: { padding: 8 },
  input: { flex: 1, borderRadius: 26, paddingHorizontal: 20, paddingVertical: 12, fontSize: 15, fontWeight: '600', maxHeight: 120, borderWidth: 1.5 },
  sendBtn: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  sendDisabled: { opacity: 0.1 },
  // Options
  modalBackdrop: { flex: 1, justifyContent: 'flex-end' },
  optionsSheet: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, paddingBottom: 60 },
  sheetHandle: { width: 40, height: 5, borderRadius: 10, alignSelf: 'center', marginBottom: 25, opacity: 0.2 },
  sheetTitle: { fontSize: 10, fontWeight: '900', color: '#9CA3AF', letterSpacing: 2, textAlign: 'center', marginBottom: 25 },
  optionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, gap: 16 },
  optionLabel: { fontSize: 15, fontWeight: '800' },
  sheetDivider: { height: 1, marginVertical: 10 }
});