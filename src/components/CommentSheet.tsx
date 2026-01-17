import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, TouchableOpacity, ActivityIndicator, Image, Platform, Alert } from 'react-native';
import BottomSheet, { 
  BottomSheetFlatList, 
  BottomSheetTextInput, 
  BottomSheetBackdrop 
} from '@gorhom/bottom-sheet';
import { Heart, Send, CornerDownRight, Trash2, Diamond, X, MessageSquare } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';

// Ecosystem
import { supabase } from '../lib/supabase';
import { useUserStore } from '../store/useUserStore';
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';
import { Product } from '../types';

/** 🛡️ COMMENT INTERFACE */
interface Comment {
  id: string;
  product_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  likes_count: number;
  profiles: {
    slug: string; // 🛡️ Changed from username to slug
    logo_url: string;
    prestige_weight: number;
    is_verified: boolean;
  };
  likes: { user_id: string }[];
}

interface CommentSheetProps {
  product: Product | null;
  sheetRef: any;
}

/**
 * 🏰 COMMENTS COMPONENT v82.0
 * Fixed: Replaced username with slug in profile joins.
 * Language: Simplified terminology for human clarity.
 */
export const CommentSheet = ({ product, sheetRef }: CommentSheetProps) => {
  const theme = Colors[useColorScheme() ?? 'light'];
  const { profile: currentUser } = useUserStore();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const snapPoints = useMemo(() => ['75%', '95%'], []);

  useEffect(() => {
    if (product?.id) fetchComments();
  }, [product?.id]);

  const fetchComments = async () => {
    if (!product?.id) return;
    setLoading(true);
    try {
      // 🛡️ DATA FIX: username -> slug
      const { data, error } = await supabase
        .from('product_comments_with_merit')
        .select(`
          *,
          profiles:user_id (slug, logo_url, prestige_weight, is_verified),
          likes:product_comment_likes(user_id)
        `)
        .eq('product_id', product.id)
        .order('merit_score', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments((data as Comment[]) || []);
    } catch (e: any) {
      console.error("Comment Sync Failure:", e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!newComment.trim() || !currentUser || !product || sending) return;
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    try {
      const { error } = await supabase
        .from('product_comments')
        .insert({
          product_id: product.id,
          user_id: currentUser.id,
          content: newComment.trim(),
          parent_id: replyTo?.id || null
        });

      if (error) throw error;

      await fetchComments();
      setNewComment('');
      setReplyTo(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Error", "Could not post your comment.");
    } finally {
      setSending(false);
    }
  };

  const toggleCommentLike = async (commentId: string) => {
    if (!currentUser) return;
    Haptics.selectionAsync();
    
    setComments(prev => prev.map(c => {
      if (c.id === commentId) {
        const isCurrentlyLiked = c.likes?.some((l) => l.user_id === currentUser.id);
        return {
          ...c,
          likes: isCurrentlyLiked ? [] : [{ user_id: currentUser.id }],
          likes_count: isCurrentlyLiked ? (c.likes_count - 1) : (c.likes_count + 1)
        };
      }
      return c;
    }));

    try {
      await supabase.rpc('toggle_comment_like', { 
        p_comment_id: commentId, 
        p_user_id: currentUser.id 
      });
    } catch (e) { console.error("Like error", e); }
  };

  const renderComment = ({ item, isChild = false }: { item: Comment, isChild?: boolean }) => {
    const isDiamond = item.profiles?.prestige_weight === 3;
    const isOwner = item.user_id === currentUser?.id;
    const isLikedByMe = item.likes?.some((l) => l.user_id === currentUser?.id);

    return (
      <View style={[
        styles.commentWrapper, 
        isChild && styles.replyWrapper,
        isDiamond && styles.diamondHighlight,
        { backgroundColor: isDiamond ? theme.surface : 'transparent' }
      ]}>
        <Image source={{ uri: item.profiles?.logo_url || 'https://via.placeholder.com/100' }} style={styles.avatar} />
        
        <View style={styles.contentColumn}>
          <View style={styles.commentHeader}>
            <View style={styles.metaRow}>
              {/* 🛡️ DATA FIX: username -> slug */}
              <Text style={[styles.username, { color: theme.text }]}>@{item.profiles?.slug?.toUpperCase()}</Text>
              {isDiamond && <Diamond size={10} color="#8B5CF6" fill="#8B5CF6" />}
              {item.profiles?.is_verified && !isDiamond && <View style={[styles.verifiedDot, { backgroundColor: Colors.brand.emerald }]} />}
            </View>
            <Text style={[styles.timeText, { color: theme.subtext }]}>{formatDistanceToNow(new Date(item.created_at))} ago</Text>
          </View>
          
          <Text style={[styles.contentText, { color: theme.text }]}>{item.content}</Text>
          
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={() => {
                setReplyTo(item);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}>
              <Text style={[styles.actionText, { color: theme.subtext }]}>REPLY</Text>
            </TouchableOpacity>
            
            {isOwner && (
              <TouchableOpacity onPress={async () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                await supabase.from('product_comments').delete().eq('id', item.id);
                setComments(prev => prev.filter(c => c.id !== item.id));
              }}>
                <Trash2 size={12} color="#EF4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <TouchableOpacity onPress={() => toggleCommentLike(item.id)} style={styles.likeContainer}>
          <Heart 
            size={14} 
            color={isLikedByMe ? "#EF4444" : theme.subtext} 
            fill={isLikedByMe ? "#EF4444" : "transparent"} 
          />
          <Text style={[styles.likeCount, { color: isLikedByMe ? '#EF4444' : theme.subtext }]}>
            {item.likes_count || 0}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <BottomSheet
      ref={sheetRef} 
      index={-1} 
      snapPoints={snapPoints} 
      enablePanDownToClose
      backdropComponent={(props) => <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />}
      handleIndicatorStyle={{ backgroundColor: theme.border, width: 40 }}
      backgroundStyle={{ backgroundColor: theme.background }}
    >
      <View style={styles.container}>
        <View style={[styles.hubHeader, { borderBottomColor: theme.surface }]}>
          <MessageSquare size={16} color={theme.text} strokeWidth={2.5} />
          <Text style={[styles.hubTitle, { color: theme.text }]}>COMMENTS</Text>
          <View style={[styles.countBadge, { backgroundColor: theme.surface }]}>
             <Text style={[styles.countText, { color: theme.subtext }]}>{comments.length}</Text>
          </View>
        </View>

        {loading && comments.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 50 }} color={Colors.brand.emerald} />
        ) : (
          <BottomSheetFlatList
            data={comments.filter(c => !c.parent_id)}
            keyExtractor={(item: Comment) => item.id}
            renderItem={({ item }: { item: Comment }) => (
              <View style={{ backgroundColor: 'transparent' }}>
                {renderComment({ item })}
                {comments.filter(child => child.parent_id === item.id).map(child => (
                  <View key={child.id} style={{ backgroundColor: 'transparent' }}>
                    {renderComment({ item: child, isChild: true })}
                  </View>
                ))}
              </View>
            )}
            contentContainerStyle={styles.listPadding}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Text style={[styles.emptyTitle, { color: theme.border }]}>NO COMMENTS YET</Text>
                <Text style={[styles.emptySub, { color: theme.subtext }]}>Be the first to share your thoughts.</Text>
              </View>
            )}
          />
        )}

        <View style={[styles.inputDock, { borderTopColor: theme.surface, backgroundColor: theme.background }]}>
          {replyTo && (
            <View style={styles.replyBanner}>
              <CornerDownRight size={14} color="#8B5CF6" />
              {/* 🛡️ DATA FIX: username -> slug */}
              <Text style={styles.replyBannerText}>REPLYING TO @{replyTo.profiles?.slug?.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}><X size={14} color="#9CA3AF" /></TouchableOpacity>
            </View>
          )}
          <View style={[styles.inputBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <BottomSheetTextInput
              placeholder="Add a comment..."
              placeholderTextColor={theme.subtext}
              style={[styles.textInput, { color: theme.text }]}
              value={newComment}
              onChangeText={setNewComment}
              multiline
            />
            <TouchableOpacity 
              style={[styles.sendBtn, { backgroundColor: theme.text }, !newComment.trim() && { opacity: 0.3 }]}
              onPress={handleSend}
              disabled={!newComment.trim() || sending}
            >
              {sending ? <ActivityIndicator size="small" color={theme.background} /> : <Send size={16} color={theme.background} strokeWidth={3} />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  hubHeader: { flexDirection: 'row', gap: 10, padding: 22, alignItems: 'center', borderBottomWidth: 1 },
  hubTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  countBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  countText: { fontSize: 9, fontWeight: '900' },
  listPadding: { padding: 25, paddingBottom: 150 },
  commentWrapper: { flexDirection: 'row', marginBottom: 28, gap: 15 },
  replyWrapper: { marginLeft: 45, marginBottom: 20, borderLeftWidth: 1.5, borderLeftColor: '#F3F4F6', paddingLeft: 15 },
  diamondHighlight: { padding: 15, borderRadius: 20, marginHorizontal: -5, borderWidth: 1, borderColor: '#EDE9FE' },
  avatar: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F3F4F6' },
  contentColumn: { flex: 1 },
  commentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  username: { fontSize: 12, fontWeight: '900' },
  verifiedDot: { width: 4, height: 4, borderRadius: 2 },
  timeText: { fontSize: 8, fontWeight: '800' },
  contentText: { fontSize: 14, lineHeight: 21, fontWeight: '500' },
  footerActions: { flexDirection: 'row', gap: 20, marginTop: 12, alignItems: 'center' },
  actionText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  likeContainer: { alignItems: 'center', gap: 4, paddingTop: 4 },
  likeCount: { fontSize: 10, fontWeight: '800' },
  inputDock: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 45 : 25, borderTopWidth: 1 },
  replyBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, backgroundColor: '#F5F3FF', padding: 10, borderRadius: 12 },
  replyBannerText: { flex: 1, fontSize: 10, fontWeight: '900', color: '#8B5CF6', letterSpacing: 0.5 },
  inputBar: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 25, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1.5 },
  textInput: { flex: 1, fontSize: 14, fontWeight: '600', maxHeight: 80 },
  sendBtn: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  emptyState: { padding: 60, alignItems: 'center' },
  emptyTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  emptySub: { fontSize: 12, textAlign: 'center', marginTop: 10, fontWeight: '500', lineHeight: 18 }
});