import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Share, Dimensions, Alert } from 'react-native';
import { 
  Gem, MapPin, Store, UserPlus, Edit3, 
  CheckCircle, User, Share2, MessageCircle, MoreHorizontal,
  UserX, ShieldAlert, Circle
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '../../constants/Colors';

// 💎 DIAMOND COMPONENTS
import { SubscriptionCountdown } from '../SubscriptionCountdown';

/** 🛠️ UTILITY: Clean & Format Names (Fixed for Diamond Zero) */
export const formatName = (name?: string) => {
  if (!name) return "";
  return name.trim();
};

const { width } = Dimensions.get('window');

/**
 * 🏰 PROFILE HEADER v103.0
 * Features: "Active Now" Pulse, Sovereign Action Menu, and Subscription Tracking.
 * Fixes: Resolved "formatName is not a function" by ensuring named export.
 */
export const ProfileHeader = ({ 
  profileData, isSelf, isFollowing, onFollow, onEdit, onMessage, 
  theme, formatNumber, bioExpanded, setBioExpanded, bioNeedsTruncation, 
  getTruncatedBio, isDiamond, router, socialSheetRef, setSocialType 
}: any) => {

  const [showActionBar, setShowActionBar] = useState(false);

  /** 🛡️ ACTIVITY PULSE: Simple English status calculation */
  const getActivityStatus = () => {
    if (!profileData?.last_seen_at) return null;
    
    const lastSeen = new Date(profileData.last_seen_at).getTime();
    const now = new Date().getTime();
    const diffInMinutes = (now - lastSeen) / (1000 * 60);

    if (diffInMinutes < 5) {
      return (
        <View style={styles.activityRow}>
          <Circle size={8} color={Colors.brand.emerald} fill={Colors.brand.emerald} />
          <Text style={[styles.activityText, { color: Colors.brand.emerald }]}>Active now</Text>
        </View>
      );
    }

    if (diffInMinutes < 60) return `Active ${Math.floor(diffInMinutes)}m ago`;
    if (diffInMinutes < 1440) return `Active ${Math.floor(diffInMinutes / 60)}h ago`;
    return null; 
  };

  const handleBlockUser = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Block User?",
      `They won't be able to message you or see your items.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "BLOCK", 
          style: "destructive", 
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            Alert.alert("User Blocked");
            setShowActionBar(false);
          } 
        }
      ]
    );
  };

  const handleShareProfile = async () => {
    if (!profileData) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const shareUrl = `https://storelink.ng/@${profileData.slug}`;
      await Share.share({
        message: `Check out ${profileData.display_name} (@${profileData.slug}) on StoreLink!\n\n${shareUrl}`,
      });
    } catch (e) { console.error("Share failed:", e); }
  };

  return (
    <View style={styles.headerContent}>
      {/* 🎭 ACTION MENU (For non-self profiles) */}
      {!isSelf && (
        <View style={styles.topActionBar}>
           <TouchableOpacity 
             style={[styles.moreBtn, { backgroundColor: theme.surface }]}
             onPress={() => {
               Haptics.selectionAsync();
               setShowActionBar(!showActionBar);
             }}
           >
             <MoreHorizontal size={20} color={theme.text} />
           </TouchableOpacity>

           {showActionBar && (
             <View style={[styles.floatingMenu, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <TouchableOpacity style={styles.menuItem} onPress={handleBlockUser}>
                  <UserX size={16} color="#EF4444" />
                  <Text style={styles.menuTextDestructive}>Block User</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.menuItem, { borderTopWidth: 1, borderTopColor: theme.border }]}
                  onPress={() => { Alert.alert("Reported", "Thank you for keeping StoreLink safe."); setShowActionBar(false); }}
                >
                  <ShieldAlert size={16} color={theme.text} />
                  <Text style={[styles.menuText, { color: theme.text }]}>Report Profile</Text>
                </TouchableOpacity>
             </View>
           )}
        </View>
      )}

      {/* 🎭 AVATAR ANCHOR */}
      <View style={styles.imageTopArea}>
        <View style={[styles.avatarFrame, isDiamond && styles.diamondHalo, { backgroundColor: theme.background }]}>
          {profileData?.logo_url ? (
            <Image source={{ uri: profileData.logo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.surface }]}>
              <User size={40} color={theme.subtext} />
            </View>
          )}
          {isDiamond && (
            <View style={[styles.diamondBadge, { backgroundColor: theme.background }]}>
              <Gem size={12} color="#8B5CF6" fill="#8B5CF6" />
            </View>
          )}
        </View>
      </View>

      {/* 🏛️ IDENTITY BLOCK */}
      <View style={styles.nameBlock}>
        <View style={styles.titleRow}>
          <Text style={[styles.fullName, { color: theme.text }]}>
            {formatName(profileData?.full_name || profileData?.display_name)}
          </Text>
          {profileData?.verification_status === 'verified' && (
            <View style={styles.verifiedBadge}>
              <CheckCircle size={14} color={Colors.brand.emerald} />
            </View>
          )}
        </View>
        
        <View style={styles.slugRow}>
          <Text style={[styles.displaySlug, { color: theme.subtext }]}>@{profileData?.slug}</Text>
          {isDiamond && <Gem size={10} color="#A78BFA" fill="#A78BFA" style={{ marginLeft: 4 }} />}
        </View>

        {/* 🟢 ACTIVITY PULSE */}
        {!isSelf && (
          <View style={styles.activityContainer}>
            {typeof getActivityStatus() === 'string' ? (
              <Text style={[styles.lastSeenText, { color: theme.subtext }]}>{getActivityStatus()}</Text>
            ) : (
              getActivityStatus()
            )}
          </View>
        )}

        {/* 📊 STATS */}
        <View style={styles.statsRow}>
          <StatItem 
            label={profileData?.is_seller ? "Drops" : "Items"} 
            value={profileData?.wardrobe_count || 0} 
            theme={theme} 
            formatNumber={formatNumber} 
          />
          <StatItem 
            label="Followers" 
            value={profileData?.follower_count || 0} 
            theme={theme} 
            onPress={() => { setSocialType('followers'); socialSheetRef.current?.expand(); }} 
            formatNumber={formatNumber} 
          />
          <StatItem 
            label="Following" 
            value={profileData?.following_count || 0} 
            theme={theme} 
            onPress={() => { setSocialType('following'); socialSheetRef.current?.expand(); }} 
            formatNumber={formatNumber} 
          />
        </View>

        {/* 💎 COUNTDOWN */}
        {isSelf && profileData?.is_seller && profileData?.subscription_expiry && (
            <SubscriptionCountdown expiryDate={profileData.subscription_expiry} plan={profileData.subscription_plan} />
        )}

        <View style={styles.badgeContainer}>
          {profileData?.is_seller && (
            <View style={[styles.badge, { backgroundColor: '#DCFCE7' }]}>
              <Store size={10} color="#166534" />
              <Text style={[styles.badgeText, { color: '#166534' }]}>Seller</Text>
            </View>
          )}
          {profileData?.location_city && (
             <View style={[styles.badge, { backgroundColor: '#E0F2FE' }]}>
               <MapPin size={10} color="#0369A1" />
               <Text style={[styles.badgeText, { color: '#0369A1' }]}>{profileData.location_city.toUpperCase()}</Text>
             </View>
          )}
        </View>

        {profileData?.bio && (
          <View style={styles.bioWrapper}>
            <Text numberOfLines={bioExpanded ? undefined : 2} style={[styles.bioText, { color: theme.text }]}>
              {bioExpanded ? profileData.bio : getTruncatedBio()}
              {!bioExpanded && bioNeedsTruncation && (
                <Text style={styles.inlineMoreText} onPress={() => setBioExpanded(true)}> more</Text>
              )}
            </Text>
          </View>
        )}
      </View>

      {/* 🚀 ACTION HANDSHAKE */}
      <View style={styles.actionRow}>
        {isSelf ? (
          <>
            <TouchableOpacity style={[styles.editButton, { backgroundColor: theme.text }]} onPress={onEdit}>
              <Edit3 size={16} color={theme.background} />
              <Text style={[styles.editButtonText, { color: theme.background }]}>EDIT PROFILE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.secondaryAction, { backgroundColor: theme.surface }]} onPress={handleShareProfile}>
              <Share2 size={20} color={theme.text} />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TouchableOpacity 
              style={[styles.followButton, { 
                backgroundColor: isFollowing ? theme.surface : theme.text, 
                borderColor: isFollowing ? theme.border : theme.text 
              }]} 
              onPress={onFollow}
            >
              <UserPlus size={16} color={isFollowing ? theme.text : theme.background} />
              <Text style={[styles.followButtonText, { color: isFollowing ? theme.text : theme.background }]}>
                {isFollowing ? 'FOLLOWING' : 'FOLLOW'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.messageButton, { backgroundColor: theme.surface }]} onPress={onMessage}>
              <MessageCircle size={20} color={theme.text} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const StatItem = ({ label, value, onPress, theme, formatNumber }: any) => (
  <TouchableOpacity style={styles.statItem} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
    <Text style={[styles.statNum, { color: theme.text }]}>
      {formatNumber ? formatNumber(value) : value}
    </Text>
    <Text style={[styles.statLabel, { color: theme.subtext }]}>{label.toUpperCase()}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  headerContent: { paddingHorizontal: 20 },
  topActionBar: { position: 'absolute', right: 20, top: 10, zIndex: 100 },
  moreBtn: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  floatingMenu: { position: 'absolute', right: 0, top: 45, width: 160, borderRadius: 16, borderWidth: 1, padding: 4, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  menuText: { fontSize: 13, fontWeight: '700' },
  menuTextDestructive: { fontSize: 13, fontWeight: '700', color: '#EF4444' },
  imageTopArea: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  avatarFrame: { padding: 4, borderRadius: 32 },
  avatarPlaceholder: { width: 110, height: 110, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  diamondHalo: { borderWidth: 3, borderColor: '#8B5CF6' },
  avatar: { width: 110, height: 110, borderRadius: 28 },
  diamondBadge: { position: 'absolute', bottom: -2, right: -2, borderRadius: 8, padding: 6, elevation: 4 },
  nameBlock: { alignItems: 'center', marginBottom: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  fullName: { fontSize: 24, fontWeight: '900', letterSpacing: -0.8 },
  verifiedBadge: { padding: 2 },
  slugRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  displaySlug: { fontSize: 14, fontWeight: '700', opacity: 0.6 },
  activityContainer: { marginBottom: 15 },
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  activityText: { fontSize: 12, fontWeight: '800' },
  lastSeenText: { fontSize: 12, fontWeight: '600', opacity: 0.7 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  statItem: { alignItems: 'center' },
  statNum: { fontSize: 20, fontWeight: '900' },
  statLabel: { fontSize: 8, fontWeight: '800', opacity: 0.5 },
  badgeContainer: { flexDirection: 'row', gap: 6, marginBottom: 15 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  badgeText: { fontSize: 9, fontWeight: '900' },
  bioWrapper: { paddingHorizontal: 20, marginBottom: 20 },
  bioText: { fontSize: 14, textAlign: 'center', lineHeight: 20, opacity: 0.8 },
  inlineMoreText: { color: Colors.brand.emerald, fontWeight: '900' },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  editButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16 },
  editButtonText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  followButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 16, borderWidth: 1.5 },
  followButtonText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  messageButton: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  secondaryAction: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
});