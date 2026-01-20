import React, { useState } from 'react';
import { 
  StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Keyboard 
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Send, CheckCircle2, ShieldAlert, Clock } from 'lucide-react-native';
import { format } from 'date-fns';
import * as Haptics from 'expo-haptics';

// 💎 SPEED ENGINE
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// App Connection
import { supabase } from '../../src/lib/supabase';
import { useUserStore } from '../../src/store/useUserStore';
import { View, Text } from '../../src/components/Themed';
import Colors from '../../src/constants/Colors';
import { useColorScheme } from '../../src/components/useColorScheme';

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: 'OPEN' | 'RESOLVED' | 'PENDING';
  admin_reply?: string;
  created_at: string;
}

/**
 * 🏰 SUPPORT DETAIL v1.1
 * Purpose: Secure one-on-one conversation between a user and the safety team.
 * Logic: Allows follow-up replies and displays the final resolution.
 */
export default function SupportDetailScreen() {
  const { ticketId } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = Colors[useColorScheme() ?? 'light'];
  const queryClient = useQueryClient();

  const [reply, setReply] = useState("");

  /** 📡 TICKET DATA SYNC */
  const { data: ticket, isLoading } = useQuery<Ticket>({
    queryKey: ['support-detail', ticketId],
    queryFn: async () => {
      if (!ticketId) throw new Error("No ticket ID");
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!ticketId,
  });

  /** 🛡️ SEND REPLY LOGIC */
  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!reply.trim()) return;
      
      // Append reply to the message thread (Single Table Pattern)
      const { error } = await supabase
        .from('support_tickets')
        .update({ 
          message: `${ticket?.message}\n\n━━━━━━━━━━━━━━━━\n[USER REPLY]: ${reply}`,
          updated_at: new Date().toISOString(),
          status: 'OPEN' // Re-opens if it was closed
        })
        .eq('id', ticketId);

      if (error) throw error;
    },
    onMutate: () => {
      Keyboard.dismiss();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    onSuccess: () => {
      setReply("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['support-detail', ticketId] });
    }
  });

  if (isLoading || !ticket) return (
    <View style={styles.centered}>
      <ActivityIndicator color={Colors.brand.emerald} size="large" />
    </View>
  );

  const isResolved = ticket.status === 'RESOLVED';
  const displayId = ticket.id.slice(0, 8).toUpperCase();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* 📱 HEADER */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20), borderBottomColor: theme.surface }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
          <ArrowLeft color={theme.text} size={26} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>TICKET #{displayId}</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          {/* 🛡️ TICKET STATUS BANNER */}
          <View style={[
            styles.statusBanner, 
            { backgroundColor: isResolved ? '#10B981' : Colors.brand.emerald }
          ]}>
            {isResolved ? <CheckCircle2 size={14} color="white" strokeWidth={3} /> : <Clock size={14} color="white" strokeWidth={3} />}
            <Text style={styles.statusText}>{isResolved ? 'ISSUE RESOLVED' : 'TICKET OPEN'}</Text>
          </View>

          <View style={styles.content}>
            <Text style={[styles.subject, { color: theme.text }]}>{ticket.subject.toUpperCase()}</Text>
            <Text style={[styles.timestamp, { color: theme.subtext }]}>
              OPENED {format(new Date(ticket.created_at), 'MMM dd, yyyy • h:mm a').toUpperCase()}
            </Text>
            
            <View style={[styles.messageBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.messageText, { color: theme.text }]}>{ticket.message}</Text>
            </View>

            {ticket.admin_reply && (
              <View style={[styles.adminReplyBox, { backgroundColor: `${Colors.brand.emerald}10`, borderColor: `${Colors.brand.emerald}30` }]}>
                <View style={styles.adminBadge}>
                    <ShieldAlert size={12} color={Colors.brand.emerald} />
                    <Text style={[styles.adminLabel, { color: Colors.brand.emerald }]}>SUPPORT TEAM</Text>
                </View>
                <Text style={[styles.messageText, { color: theme.text }]}>{ticket.admin_reply}</Text>
              </View>
            )}
          </View>
        </ScrollView>

        {/* 📝 REPLY INPUT */}
        {!isResolved && (
          <View style={[
            styles.inputContainer, 
            { 
              paddingBottom: Math.max(insets.bottom, 20), 
              backgroundColor: theme.background, 
              borderTopColor: theme.surface 
            }
          ]}>
            <TextInput
              style={[styles.input, { backgroundColor: theme.surface, color: theme.text, borderColor: theme.border }]}
              placeholder="Type your follow-up here..."
              placeholderTextColor={theme.subtext}
              value={reply}
              onChangeText={setReply}
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity 
              style={[
                styles.sendBtn, 
                { backgroundColor: theme.text, opacity: (!reply.trim() || replyMutation.isPending) ? 0.5 : 1 }
              ]}
              onPress={() => replyMutation.mutate()}
              disabled={!reply.trim() || replyMutation.isPending}
            >
              {replyMutation.isPending ? (
                <ActivityIndicator size="small" color={theme.background} />
              ) : (
                <Send size={18} color={theme.background} strokeWidth={2.5} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingBottom: 15, 
    borderBottomWidth: 1 
  },
  headerTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  backBtn: { width: 44, height: 44, justifyContent: 'center' },
  
  scroll: { paddingBottom: 40 },
  
  statusBanner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8, 
    paddingVertical: 10,
    marginBottom: 20
  },
  statusText: { color: 'white', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  
  content: { paddingHorizontal: 25 },
  subject: { fontSize: 20, fontWeight: '900', marginBottom: 8, lineHeight: 26 },
  timestamp: { fontSize: 10, fontWeight: '800', marginBottom: 25, opacity: 0.6, letterSpacing: 0.5 },
  
  messageBox: { padding: 20, borderRadius: 24, borderWidth: 1.5, marginBottom: 25 },
  messageText: { fontSize: 15, fontWeight: '500', lineHeight: 24 },
  
  adminReplyBox: { padding: 20, borderRadius: 24, marginBottom: 20, borderWidth: 1 },
  adminBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  adminLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  
  inputContainer: { 
    flexDirection: 'row', 
    alignItems: 'flex-end',
    padding: 15, 
    gap: 12, 
    borderTopWidth: 1 
  },
  input: { 
    flex: 1, 
    borderRadius: 22, 
    paddingHorizontal: 18, 
    paddingVertical: 14, 
    borderWidth: 1, 
    maxHeight: 120,
    minHeight: 50,
    fontSize: 15,
    fontWeight: '500'
  },
  sendBtn: { 
    width: 50, 
    height: 50, 
    borderRadius: 25, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 0
  }
});