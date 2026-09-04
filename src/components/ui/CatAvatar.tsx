import { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Colors, Radius, Spacing } from '@/constants/theme';

export interface AvatarEquipped {
  hat: string | null;
  outfit: string | null;
  background: string | null;
  accessory: string | null;
}

export const HAT_ITEMS: Record<string, string> = {
  none: '',
  party: '🎉',
  crown: '👑',
  cap: '🧢',
  tophat: '🎩',
  halo: '😇',
};

export const OUTFIT_ITEMS: Record<string, string> = {
  none: '',
  bowtie: '🎀',
  shield: '🛡️',
  medal: '🏅',
  heart: '❤️',
  star: '⭐',
};

export const BACKGROUND_ITEMS: Record<string, string> = {
  white: '#F7F9FC',
  sky: '#DBEAFE',
  sunset: '#FEF3C7',
  forest: '#D1FAE5',
  night: '#1E1E2E',
};

export const ACCESSORY_ITEMS: Record<string, string> = {
  none: '',
  trophy: '🏆',
  sparkle: '✨',
  fire: '🔥',
  rainbow: '🌈',
  muscle: '💪',
};

// Mood derived from streak
type CatMood = 'sad' | 'neutral' | 'happy' | 'thriving' | 'legendary';

function getMood(streak: number): CatMood {
  if (streak === 0) return 'sad';
  if (streak < 3) return 'neutral';
  if (streak < 7) return 'happy';
  if (streak < 30) return 'thriving';
  return 'legendary';
}

// ── Drawn cat using pure RN Views ─────────────────────────────────────────────

interface DrawnCatProps {
  mood: CatMood;
  size: number;
}

function DrawnCat({ mood, size: s }: DrawnCatProps) {
  const isSad = mood === 'sad';
  const isHappy = mood === 'thriving' || mood === 'legendary';

  // Eye shape changes with mood
  const eyeH = isSad ? s * 0.045 : s * 0.072;
  const pupilH = isSad ? s * 0.028 : s * 0.05;

  // Blush only when happy/thriving/legendary
  const showBlush = isHappy;

  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'flex-end' }}>

      {/* ── Ears ── */}
      <View style={[styles.earsRow, { bottom: s * 0.62, width: s * 0.78 }]}>
        {/* Left ear */}
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: s * 0.13, borderRightWidth: s * 0.13,
          borderBottomWidth: s * 0.22,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: '#1A1A1A',
          marginLeft: s * 0.04,
        }} />
        {/* Left inner ear */}
        <View style={{
          position: 'absolute',
          left: s * 0.065,
          bottom: 0,
          width: 0, height: 0,
          borderLeftWidth: s * 0.075, borderRightWidth: s * 0.075,
          borderBottomWidth: s * 0.13,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: '#3D2A2A',
        }} />
        {/* Right ear */}
        <View style={{
          width: 0, height: 0,
          borderLeftWidth: s * 0.13, borderRightWidth: s * 0.13,
          borderBottomWidth: s * 0.22,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: '#1A1A1A',
          marginRight: s * 0.04,
        }} />
        {/* Right inner ear */}
        <View style={{
          position: 'absolute',
          right: s * 0.065,
          bottom: 0,
          width: 0, height: 0,
          borderLeftWidth: s * 0.075, borderRightWidth: s * 0.075,
          borderBottomWidth: s * 0.13,
          borderLeftColor: 'transparent', borderRightColor: 'transparent',
          borderBottomColor: '#3D2A2A',
        }} />
      </View>

      {/* ── Head ── */}
      <View style={{
        width: s * 0.78,
        height: s * 0.62,
        borderRadius: s * 0.34,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        marginBottom: s * 0.02,
      }}>

        {/* Eyes row */}
        <View style={{
          flexDirection: 'row',
          gap: s * 0.14,
          marginTop: isSad ? s * 0.04 : 0,
          marginBottom: s * 0.02,
        }}>
          {/* Left eye */}
          <View style={{
            width: s * 0.15, height: eyeH,
            borderRadius: s * 0.08,
            backgroundColor: '#FFFFFF',
            alignItems: 'center', justifyContent: 'center',
            transform: isSad ? [{ rotate: '10deg' }] : [],
          }}>
            <View style={{
              width: s * 0.09, height: pupilH,
              borderRadius: s * 0.05,
              backgroundColor: '#2D6A9F',
            }} />
            {/* Shine */}
            <View style={{
              position: 'absolute', top: 2, right: 2,
              width: s * 0.03, height: s * 0.03,
              borderRadius: s * 0.015,
              backgroundColor: '#FFFFFF',
            }} />
          </View>

          {/* Right eye */}
          <View style={{
            width: s * 0.15, height: eyeH,
            borderRadius: s * 0.08,
            backgroundColor: '#FFFFFF',
            alignItems: 'center', justifyContent: 'center',
            transform: isSad ? [{ rotate: '-10deg' }] : [],
          }}>
            <View style={{
              width: s * 0.09, height: pupilH,
              borderRadius: s * 0.05,
              backgroundColor: '#2D6A9F',
            }} />
            <View style={{
              position: 'absolute', top: 2, right: 2,
              width: s * 0.03, height: s * 0.03,
              borderRadius: s * 0.015,
              backgroundColor: '#FFFFFF',
            }} />
          </View>
        </View>

        {/* Nose */}
        <View style={{
          width: s * 0.06, height: s * 0.04,
          borderRadius: s * 0.02,
          backgroundColor: '#E8799A',
          marginBottom: s * 0.01,
        }} />

        {/* Mouth */}
        <View style={{ flexDirection: 'row', gap: s * 0.01 }}>
          <View style={{
            width: s * 0.07, height: s * 0.025,
            borderBottomLeftRadius: s * 0.04,
            borderTopRightRadius: s * 0.01,
            borderBottomWidth: 2,
            borderLeftWidth: 2,
            borderColor: '#E8799A',
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            transform: isSad ? [{ rotate: '180deg' }, { translateY: -s * 0.015 }] : [],
          }} />
          <View style={{
            width: s * 0.07, height: s * 0.025,
            borderBottomRightRadius: s * 0.04,
            borderTopLeftRadius: s * 0.01,
            borderBottomWidth: 2,
            borderRightWidth: 2,
            borderColor: '#E8799A',
            borderTopColor: 'transparent',
            borderLeftColor: 'transparent',
            transform: isSad ? [{ rotate: '180deg' }, { translateY: -s * 0.015 }] : [],
          }} />
        </View>

        {/* Whiskers */}
        <View style={[styles.whiskersRow, { top: s * 0.27, width: s * 0.72 }]}>
          {/* Left whiskers */}
          <View style={{ gap: s * 0.03 }}>
            <View style={{ width: s * 0.22, height: 1.5, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '-8deg' }] }} />
            <View style={{ width: s * 0.22, height: 1.5, backgroundColor: 'rgba(255,255,255,0.35)' }} />
            <View style={{ width: s * 0.22, height: 1.5, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '8deg' }] }} />
          </View>
          {/* Right whiskers */}
          <View style={{ gap: s * 0.03 }}>
            <View style={{ width: s * 0.22, height: 1.5, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '8deg' }] }} />
            <View style={{ width: s * 0.22, height: 1.5, backgroundColor: 'rgba(255,255,255,0.35)' }} />
            <View style={{ width: s * 0.22, height: 1.5, backgroundColor: 'rgba(255,255,255,0.35)', transform: [{ rotate: '-8deg' }] }} />
          </View>
        </View>

        {/* Blush */}
        {showBlush && (
          <View style={[styles.blushRow, { top: s * 0.28, width: s * 0.6 }]}>
            <View style={{ width: s * 0.14, height: s * 0.06, borderRadius: s * 0.05, backgroundColor: 'rgba(255,150,170,0.3)' }} />
            <View style={{ width: s * 0.14, height: s * 0.06, borderRadius: s * 0.05, backgroundColor: 'rgba(255,150,170,0.3)' }} />
          </View>
        )}

        {/* Sad tears */}
        {isSad && (
          <View style={[styles.blushRow, { top: s * 0.24, width: s * 0.5 }]}>
            <View style={{ width: s * 0.03, height: s * 0.07, borderRadius: s * 0.015, backgroundColor: 'rgba(100,180,255,0.6)' }} />
            <View style={{ width: s * 0.03, height: s * 0.07, borderRadius: s * 0.015, backgroundColor: 'rgba(100,180,255,0.6)' }} />
          </View>
        )}
      </View>

      {/* ── Body ── */}
      <View style={{
        width: s * 0.68,
        height: s * 0.42,
        borderRadius: s * 0.26,
        backgroundColor: '#1A1A1A',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingBottom: s * 0.05,
        zIndex: 0,
        marginTop: -s * 0.06,
      }}>
        {/* Belly patch */}
        <View style={{
          width: s * 0.36,
          height: s * 0.24,
          borderRadius: s * 0.16,
          backgroundColor: '#2E2E2E',
        }} />

        {/* Paws */}
        <View style={{
          flexDirection: 'row',
          gap: s * 0.08,
          position: 'absolute',
          bottom: -s * 0.04,
        }}>
          <View style={{ width: s * 0.14, height: s * 0.1, borderRadius: s * 0.07, backgroundColor: '#1A1A1A' }} />
          <View style={{ width: s * 0.14, height: s * 0.1, borderRadius: s * 0.07, backgroundColor: '#1A1A1A' }} />
        </View>
      </View>

      {/* ── Tail ── */}
      <View style={{
        position: 'absolute',
        bottom: s * 0.02,
        right: s * 0.04,
        width: s * 0.12,
        height: s * 0.35,
        borderRadius: s * 0.07,
        backgroundColor: '#1A1A1A',
        transform: [{ rotate: '20deg' }],
      }} />

    </View>
  );
}

// ── Main CatAvatar component ──────────────────────────────────────────────────

interface CatAvatarProps {
  equipped: AvatarEquipped;
  recoveryPoints: number;
  streak: number;
  size?: 'small' | 'medium' | 'large';
  onPress?: () => void;
}

export function CatAvatar({
  equipped,
  recoveryPoints,
  streak,
  size = 'medium',
  onPress,
}: CatAvatarProps) {
  const translateY = useSharedValue(0);
  const tailRotate = useSharedValue(0);
  const scale = useSharedValue(1);

  const sizes = { small: 80, medium: 120, large: 160 };
  const containerSize = sizes[size];
  const catSize = containerSize * 0.88;

  const mood = getMood(streak);

  // Idle bounce — faster and bigger when happy
  useEffect(() => {
    const duration = mood === 'legendary' ? 500 : mood === 'sad' ? 1400 : 900;
    const distance = mood === 'sad' ? -2 : mood === 'legendary' ? -10 : -6;

    translateY.value = withRepeat(
      withSequence(
        withTiming(distance, { duration, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Tail wag — slower when sad
    const wagSpeed = mood === 'sad' ? 900 : mood === 'legendary' ? 250 : 450;
    tailRotate.value = withRepeat(
      withSequence(
        withTiming(18, { duration: wagSpeed }),
        withTiming(-18, { duration: wagSpeed })
      ),
      -1,
      true
    );
  }, [mood]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const bgColor = BACKGROUND_ITEMS[equipped.background ?? 'white'] ?? Colors.light.primaryLight;
  const hat = HAT_ITEMS[equipped.hat ?? 'none'] ?? '';
  const outfit = OUTFIT_ITEMS[equipped.outfit ?? 'none'] ?? '';
  const accessory = ACCESSORY_ITEMS[equipped.accessory ?? 'none'] ?? '';

  return (
    <Pressable onPress={onPress ?? (() => router.push('/avatar-shop' as any))}>
      <View style={[
        styles.container,
        { width: containerSize, height: containerSize, backgroundColor: bgColor },
      ]}>

        {/* Hat */}
        {hat ? (
          <Text style={[styles.hat, { fontSize: catSize * 0.28, top: containerSize * 0.04 }]}>
            {hat}
          </Text>
        ) : null}

        {/* Accessory top-right */}
        {accessory ? (
          <Text style={[styles.accessory, { fontSize: catSize * 0.22 }]}>
            {accessory}
          </Text>
        ) : null}

        {/* Animated cat body */}
        <Animated.View style={[styles.catWrapper, bodyStyle]}>
          <DrawnCat mood={mood} size={catSize} />
        </Animated.View>

        {/* Outfit badge bottom-left */}
        {outfit ? (
          <Text style={[styles.outfit, { fontSize: catSize * 0.24 }]}>
            {outfit}
          </Text>
        ) : null}

        {/* Recovery points badge */}
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>⚡{recoveryPoints}</Text>
        </View>

        {/* Legendary sparkle ring */}
        {mood === 'legendary' && (
          <View style={[StyleSheet.absoluteFillObject, styles.legendaryRing]} pointerEvents="none" />
        )}
      </View>

      {size !== 'small' && (
        <Text style={styles.shopHint}>Tap to customize</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.xl,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  catWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  hat: {
    position: 'absolute',
    top: 4,
    zIndex: 3,
  },
  outfit: {
    position: 'absolute',
    bottom: 14,
    left: 6,
    zIndex: 2,
  },
  accessory: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 3,
  },
  pointsBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 2,
    zIndex: 4,
  },
  pointsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  earsRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 0,
  },
  whiskersRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  blushRow: {
    position: 'absolute',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  shopHint: {
    textAlign: 'center',
    color: Colors.light.textMuted,
    fontSize: 11,
    marginTop: Spacing.xs,
  },
  legendaryRing: {
    borderRadius: Radius.xl,
    borderWidth: 2.5,
    borderColor: '#FBBF24',
  },
});
