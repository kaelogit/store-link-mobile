import React, { useState, useRef, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Platform, Alert, Dimensions, View as RNView } from 'react-native';
import BottomSheet, { 
  BottomSheetFlatList, 
  BottomSheetTextInput, 
  BottomSheetBackdrop 
} from '@gorhom/bottom-sheet';
import { Heart, Send, CornerDownRight, Trash2, X, MessageSquare, Gem } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import { BlurView } from 'expo-blur';

// 🚀 DIAMOND SPEED ENGINE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';

// App Connection
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';
import { Product } from '../types';

const { width } = Dimensions.get('window');

interface Comment {
  id: string;
  product_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  likes_count: number;
  profiles: {
    slug: string;
    logo_url: string;
    prestige_weight: number;
    is_verified: boolean;
    subscription_plan?: string;
  };
  is_liked_by_me?: boolean;
}

interface CommentSheetProps {
  product: Product | null;
  sheetRef: any;
}

/**
 * 💬 REVIEWS HUB v86.0
 * Purpose: High-fidelity threaded reviews with Diamond Prestige recognition.
 */
export const CommentSheet = ({ product, sheetRef }: CommentSheetProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile: currentUser } = useUserStore();
  const queryClient = useQueryClient();
  
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);

  /** 📡 DATA SYNC: Fetching threaded comments */
  const { 
    data: comments = [], 
    isLoading 
  } = useQuery({
    queryKey: ['product-comments', product?.id],
    queryFn: async () => {
      if (!product?.id) return [];
      const { data, error } = await supabase
        .from('product_comments')
        .select(`
          *,
          profiles:user_id (slug, logo_url, prestige_weight, is_verified, subscription_plan)
        `)
        .eq('product_id', product.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Comment[];
    },
    enabled: !!product?.id,
    staleTime: 1000 * 60 * 2,
  });

  /** 🚀 POST LOGIC: Integrated with Threaded Replies */
  const postMutation = useMutation({
    mutationFn: async (content: string) => {
      return supabase.from('product_comments').insert({
        product_id: product?.id,
        user_id: currentUser?.id,
        content: content.trim(),
        parent_id: replyTo?.id || null
      });
    },
    onSuccess: () => {
      setNewComment('');
      setReplyTo(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['product-comments', product?.id] });
    }
  });

  const handleSend = () => {
    if (!newComment.trim() || postMutation.isPending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    postMutation.mutate(newComment);
  };

  const renderBackdrop = useCallback(
    (props: any) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
    []
  );

  const renderComment = ({ item, isChild = false }: { item: Comment, isChild?: boolean }) => {
    // 💎 Logic: Buyer or Seller Diamond recognition
    const isDiamond = item.profiles?.subscription_plan === 'diamond';
    const isOwner = item.user_id === currentUser?.id;

    return (
      <View style={[
        styles.commentRow, 
        isChild && styles.replyIndent,
        isDiamond && { backgroundColor: `${Colors.brand.violet}10`, borderRadius: 20, padding: 12, marginHorizontal: -12 }
      ]}>
        <Image 
          source={item.profiles?.logo_url} 
          style={[styles.avatar, isDiamond && { borderColor: '#8B5CF6', borderWidth: 1.5 }]} 
          contentFit="cover" 
          transition={200}
          cachePolicy="memory-disk" 
        />
        
        <View style={styles.textStack}>
          <View style={styles.commentHeader}>
            <View style={styles.nameRow}>
              <Text style={[styles.slug, { color: theme.text }]}>@{item.profiles?.slug?.toUpperCase()}</Text>
              {isDiamond && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" style={{ marginLeft: 4 }} />}
            </View>
            <Text style={[styles.time, { color: theme.subtext }]}>
              {item.created_at ? formatDistanceToNow(new Date(item.created_at), { addSuffix: false }) : 'Just now'}
            </Text>
          </View>
          
          <Text style={[styles.content, { color: theme.text }]}>{item.content}</Text>
          
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => { setReplyTo(item); Haptics.selectionAsync(); }}>
              <Text style={[styles.footerBtn, { color: theme.subtext }]}>REPLY</Text>
            </TouchableOpacity>
            {isOwner && (
              <TouchableOpacity onPress={() => Alert.alert("Delete Review?", "This action cannot be undone.", [{text: "Cancel"}, {text: "Delete", style: "destructive"}])}>
                <Trash2 size={12} color="#EF4444" opacity={0.6} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity style={styles.likeCol} onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}>
          <Heart size={14} color={theme.subtext} strokeWidth={2.5} />
          <Text style={[styles.likeCount, { color: theme.subtext }]}>{item.likes_count || 0}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <BottomSheet
      ref={sheetRef} 
      index={-1} 
      snapPoints={['75%', '90%']} 
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: theme.border, width: 40 }}
      backgroundStyle={{ backgroundColor: theme.background }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <View style={styles.inner}>
        <View style={[styles.header, { borderBottomColor: theme.surface }]}>
          <MessageSquare size={18} color={theme.text} strokeWidth={2.5} />
          <Text style={[styles.title, { color: theme.text }]}>REVIEWS</Text>
          <View style={[styles.badge, { backgroundColor: theme.surface }]}>
            <Text style={[styles.badgeText, { color: theme.text }]}>{comments.length}</Text>
          </View>
        </View>

        <BottomSheetFlatList
          data={comments.filter(c => !c.parent_id)}
          keyExtractor={(item: Comment) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }: { item: any }) => (
            <View style={styles.transparentBg}>
              {renderComment({ item })}
              {comments.filter(child => child.parent_id === item.id).map(child => (
                <View key={`child-${child.id}`} style={styles.transparentBg}>
                  {renderComment({ item: child, isChild: true })}
                </View>
              ))}
            </View>
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={() => !isLoading && (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.border }]}>NO REVIEWS YET</Text>
              <Text style={[styles.emptySub, { color: theme.subtext }]}>Be the first to share your thoughts on this item.</Text>
            </View>
          )}
        />

        {/* INPUT DOCK */}
        <BlurView 
          intensity={Platform.OS === 'ios' ? 80 : 0} 
          tint={theme.background === '#000000' ? 'dark' : 'light'}
          style={styles.blurContainer}
        >
          <View style={[styles.inputDock, { borderTopColor: theme.surface }]}>
            {replyTo && (
              <View style={styles.replyBar}>
                <CornerDownRight size={14} color="#8B5CF6" />
                <Text style={styles.replyText} numberOfLines={1}>REPLYING TO @{replyTo.profiles?.slug?.toUpperCase()}</Text>
                <TouchableOpacity onPress={() => setReplyTo(null)}><X size={14} color={theme.subtext} /></TouchableOpacity>
              </View>
            )}
            <View style={[styles.inputField, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <BottomSheetTextInput
                placeholder="Write a review..."
                placeholderTextColor={`${theme.subtext}80`}
                style={[styles.textInput, { color: theme.text }]}
                value={newComment}
                onChangeText={setNewComment}
                multiline
              />
              <TouchableOpacity 
                style={[styles.sendBtn, { backgroundColor: theme.text }, !newComment.trim() && { opacity: 0.3 }]}
                onPress={handleSend}
                disabled={!newComment.trim() || postMutation.isPending}
              >
                {postMutation.isPending ? <ActivityIndicator size="small" color={theme.background} /> : <Send size={16} color={theme.background} strokeWidth={3} />}
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  inner: { flex: 1 },
  transparentBg: { backgroundColor: 'transparent' },
  header: { flexDirection: 'row', gap: 10, padding: 20, alignItems: 'center', borderBottomWidth: 1.5, justifyContent: 'center' },
  title: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontWeight: '900' },
  
  list: { padding: 20, paddingBottom: 150 },
  commentRow: { flexDirection: 'row', marginBottom: 25, gap: 12 },
  replyIndent: { marginLeft: 35, borderLeftWidth: 1.5, borderLeftColor: 'rgba(0,0,0,0.05)', paddingLeft: 12 },
  
  avatar: { width: 36, height: 36, borderRadius: 14, backgroundColor: '#F3F4F6' },
  textStack: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  slug: { fontSize: 12, fontWeight: '900' },
  time: { fontSize: 9, fontWeight: '700', opacity: 0.6 },
  content: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  
  footer: { flexDirection: 'row', gap: 15, marginTop: 10, alignItems: 'center' },
  footerBtn: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  
  likeCol: { alignItems: 'center', gap: 4, paddingTop: 4 },
  likeCount: { fontSize: 9, fontWeight: '900' },
  
  blurContainer: { borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: 'hidden' },
  inputDock: { padding: 15, paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopWidth: 1.5 },
  replyBar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: 'rgba(139, 92, 246, 0.1)', padding: 10, borderRadius: 12 },
  replyText: { flex: 1, fontSize: 10, fontWeight: '900', color: '#8B5CF6', letterSpacing: 0.5 },
  
  inputField: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1.5 },
  textInput: { flex: 1, fontSize: 15, fontWeight: '600', maxHeight: 80, paddingVertical: 5 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  
  empty: { padding: 80, alignItems: 'center' },
  emptyTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  emptySub: { fontSize: 13, textAlign: 'center', marginTop: 10, fontWeight: '500', opacity: 0.6 }
});