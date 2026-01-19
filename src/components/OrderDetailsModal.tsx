import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Alert, Dimensions, Image 
} from 'react-native';
import { 
  X, CheckCircle2, MessageSquare, Clock, 
  CreditCard, XCircle, Truck, PackageCheck, Gem
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

// Ecosystem
import { supabase } from '../lib/supabase';
import { View, Text } from './Themed';
import Colors from '../constants/Colors';
import { useColorScheme } from './useColorScheme';

const { width } = Dimensions.get('window');

interface OrderDetailsProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  isMerchantView?: boolean;
}

/**
 * 🏰 ORDER DETAILS v97.0
 * Purpose: A clear view for tracking order progress and managing sales.
 * Logic: Updates order status and automatically syncs with the chat deal status.
 */
export const OrderDetailsModal = ({ order, isOpen, onClose, onUpdate, isMerchantView = false }: OrderDetailsProps) => {
  const router = useRouter();
  const theme = Colors[useColorScheme() ?? 'light'];
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (isOpen && order) fetchOrderItems();
  }, [isOpen, order]);

  const fetchOrderItems = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("order_items")
      .select("*, products(image_urls)")
      .eq("order_id", order.id);
    setItems(data || []);
    setLoading(false);
  };

  /** 🛡️ UPDATE PROCESS */
  const handleUpdateStatus = async (newStatus: string, hapticStyle: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Medium) => {
    setProcessing(true);
    Haptics.impactAsync(hapticStyle);
    
    try {
      // 1. Update the official Order Record
      const { error: orderError } = await supabase
        .from("orders")
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', order.id);

      if (orderError) throw orderError;

      // 2. Sync with the conversation status
      await supabase
        .from('conversations')
        .update({ deal_status: newStatus })
        .eq('order_id', order.id);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdate();
      onClose();
    } catch (e: any) {
      Alert.alert("Error", "Failed to update the order status.");
    } finally {
      setProcessing(false);
    }
  };

  if (!isOpen || !order) return null;

  const status = order.status || 'pending';
  const merchantIsDiamond = order.merchant?.subscription_plan === 'diamond';

  const renderActions = () => {
    if (isMerchantView) {
      if (status === 'pending') {
        return (
          <View style={styles.actionColumn}>
            <ActionButton label="CONFIRM PAYMENT" color={theme.text} icon={CheckCircle2} onPress={() => handleUpdateStatus('confirmed')} theme={theme} />
            <TouchableOpacity style={styles.cancelBtn} onPress={() => handleUpdateStatus('cancelled')}>
              <XCircle size={16} color="#EF4444" />
              <Text style={styles.cancelText}>CANCEL ORDER</Text>
            </TouchableOpacity>
          </View>
        );
      }
      if (status === 'confirmed') {
        return <ActionButton label="MARK AS SENT" color={Colors.brand.emerald} icon={Truck} onPress={() => handleUpdateStatus('delivered')} theme={theme} />;
      }
      return null;
    } else {
      if (status === 'delivered') {
        return <ActionButton label="CONFIRM DELIVERY" color={Colors.brand.emerald} icon={PackageCheck} onPress={() => handleUpdateStatus('completed', Haptics.ImpactFeedbackStyle.Heavy)} theme={theme} />;
      }
      return null;
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <TouchableOpacity activeOpacity={1} style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { borderBottomColor: theme.surface }]}>
          <TouchableOpacity onPress={() => { onClose(); router.push(`/chat/${order.id}` as any); }} style={styles.chatLink}>
            <MessageSquare size={20} color={Colors.brand.emerald} strokeWidth={2.5} />
            <Text style={[styles.chatLinkText, { color: Colors.brand.emerald }]}>CHAT</Text>
          </TouchableOpacity>
          <View style={[styles.headerHandle, { backgroundColor: theme.border }]} />
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: theme.surface }]}>
            <X size={20} color={theme.text} strokeWidth={3} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* 🛡️ PROGRESS TRACKER */}
          <View style={styles.stepperContainer}>
            <Step active={true} label="Ordered" icon={Clock} theme={theme} />
            <Line active={['confirmed', 'delivered', 'completed'].includes(status)} theme={theme} />
            <Step active={['confirmed', 'delivered', 'completed'].includes(status)} label="Paid" icon={CreditCard} theme={theme} />
            <Line active={['delivered', 'completed'].includes(status)} theme={theme} />
            <Step active={['delivered', 'completed'].includes(status)} label="Sent" icon={Truck} theme={theme} />
            <Line active={['completed'].includes(status)} theme={theme} />
            <Step active={['completed'].includes(status)} label="Done" icon={PackageCheck} theme={theme} />
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
             <Text style={[styles.sectionLabel, { color: theme.text }]}>ORDER SUMMARY</Text>
             <View style={styles.partnerRow}>
               <Text style={[styles.infoLabel, { color: theme.subtext }]}>{isMerchantView ? "BUYER" : "STORE"}</Text>
               <View style={styles.partnerInfo}>
                 <Text style={[styles.infoValue, { color: theme.text }]}>
                   {isMerchantView ? `@${order.buyer?.slug?.toUpperCase()}` : order.merchant?.display_name?.toUpperCase()}
                 </Text>
                 {merchantIsDiamond && !isMerchantView && <Gem size={10} color="#8B5CF6" fill="#8B5CF6" style={{marginLeft: 4}} />}
               </View>
             </View>
             <InfoRow label="ORDER ID" value={`#${order.id.slice(0,12).toUpperCase()}`} theme={theme} />
          </View>

          <Text style={[styles.sectionLabel, { color: theme.text }]}>ITEMS ORDERED</Text>
          {loading ? <ActivityIndicator color={Colors.brand.emerald} /> : (
            <View style={styles.itemsList}>
              {items.map((item, idx) => (
                <View key={idx} style={styles.itemRow}>
                  <Image source={{ uri: item.products?.image_urls?.[0] }} style={styles.itemThumb} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.itemName, { color: theme.text }]}>{item.product_name.toUpperCase()}</Text>
                    <Text style={[styles.itemQty, { color: theme.subtext }]}>QTY: {item.quantity}</Text>
                  </View>
                  <Text style={[styles.itemPrice, { color: theme.text }]}>₦{item.unit_price.toLocaleString()}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.totalSection, { borderTopColor: theme.surface }]}>
            <View style={styles.totalRow}>
              <Text style={styles.grandLabel}>TOTAL PRICE</Text>
              <Text style={[styles.grandVal, { color: theme.text }]}>₦{order.total_amount.toLocaleString()}</Text>
            </View>
            
            <View style={styles.actions}>
              {processing ? (
                <ActivityIndicator color={Colors.brand.emerald} size="large" />
              ) : (
                <>
                  {renderActions()}
                  {status === 'completed' && (
                    <View style={[styles.completedBadge, { borderColor: Colors.brand.emerald }]}>
                       <CheckCircle2 color={Colors.brand.emerald} size={20} strokeWidth={3} />
                       <Text style={[styles.completedText, { color: Colors.brand.emerald }]}>ORDER COMPLETED</Text>
                    </View>
                  )}
                  {status === 'cancelled' && (
                    <View style={[styles.completedBadge, { borderColor: '#EF4444' }]}>
                       <XCircle color="#EF4444" size={20} strokeWidth={3} />
                       <Text style={[styles.completedText, { color: '#EF4444' }]}>ORDER CANCELLED</Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

// --- SUB-COMPONENTS ---
const Step = ({ active, label, icon: Icon, theme }: any) => (
  <View style={styles.stepBox}>
    <View style={[styles.stepCircle, { backgroundColor: theme.surface }, active && { backgroundColor: theme.text }]}>
      <Icon size={12} color={active ? theme.background : theme.subtext} strokeWidth={3} />
    </View>
    <Text style={[styles.stepLabel, { color: theme.subtext }, active && { color: theme.text }]}>{label}</Text>
  </View>
);

const Line = ({ active, theme }: { active: boolean, theme: any }) => (
  <View style={[styles.stepLine, { backgroundColor: theme.surface }, active && { backgroundColor: theme.text }]} />
);

const InfoRow = ({ label, value, theme }: any) => (
  <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
    <Text style={[styles.infoLabel, { color: theme.subtext }]}>{label}</Text>
    <Text style={[styles.infoValue, { color: theme.text }]}>{value || '---'}</Text>
  </View>
);

const ActionButton = ({ label, color, icon: Icon, onPress, theme }: any) => (
  <TouchableOpacity style={[styles.mainBtn, { backgroundColor: color }]} onPress={onPress}>
    <Icon size={18} color={color === theme.text ? theme.background : 'white'} strokeWidth={3} />
    <Text style={[styles.btnTextWhite, { color: color === theme.text ? theme.background : 'white' }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { position: 'absolute', bottom: 0, width: '100%', height: '90%', borderTopLeftRadius: 40, borderTopRightRadius: 40, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1.5 },
  headerHandle: { width: 40, height: 5, borderRadius: 10 },
  chatLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chatLinkText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  closeBtn: { padding: 8, borderRadius: 12 },
  content: { padding: 25 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  stepBox: { alignItems: 'center', width: 60 },
  stepCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  stepLabel: { fontSize: 7, fontWeight: '900', textTransform: 'uppercase' },
  stepLine: { flex: 1, height: 2, marginBottom: 20, marginHorizontal: -10 },
  infoCard: { borderRadius: 24, padding: 20, marginBottom: 30, borderWidth: 1 },
  infoRow: { borderBottomWidth: 1, paddingVertical: 12 },
  partnerRow: { borderBottomWidth: 1, paddingVertical: 12 },
  partnerInfo: { flexDirection: 'row', alignItems: 'center' },
  infoLabel: { fontSize: 8, fontWeight: '900', marginBottom: 4, letterSpacing: 1 },
  infoValue: { fontSize: 13, fontWeight: '800' },
  sectionLabel: { fontSize: 10, fontWeight: '900', marginBottom: 15, letterSpacing: 1.2 },
  itemsList: { marginBottom: 30 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  itemThumb: { width: 50, height: 60, borderRadius: 12, backgroundColor: '#F3F4F6' },
  itemName: { fontSize: 11, fontWeight: '900' },
  itemQty: { fontSize: 8, fontWeight: '800', marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '900' },
  totalSection: { borderTopWidth: 1.5, paddingTop: 25 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  grandLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  grandVal: { fontSize: 24, fontWeight: '900', letterSpacing: -1 },
  actions: { gap: 12, marginTop: 25 },
  actionColumn: { gap: 12 },
  mainBtn: { height: 64, borderRadius: 20, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
  btnTextWhite: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  cancelBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 10 },
  cancelText: { color: '#EF4444', fontSize: 10, fontWeight: '900' },
  completedBadge: { height: 64, borderRadius: 20, borderStyle: 'dashed', borderWidth: 2, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  completedText: { fontWeight: '900', fontSize: 11, letterSpacing: 1 }
});