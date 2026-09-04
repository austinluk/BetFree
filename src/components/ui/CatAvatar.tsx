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
  const eyeScale = useSharedValue(1);

  const sizes = { small: 80, medium: 120, large: 160 };
  const containerSize = sizes[size];
  const catSize = containerSize * 0.55;

  // Idle bounce animation
  useEffect(() => {
    translateY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );

    // Tail wag
    tailRotate.value = withRepeat(
      withSequence(
        withTiming(20, { duration: 400 }),
        withTiming(-20, { duration: 400 })
      ),
      -1,
      true
    );

    // Occasional blink
    const blinkInterval = setInterval(() => {
      eyeScale.value = withSequence(
        withTiming(0.1, { duration: 80 }),
        withTiming(1, { duration: 80 })
      );
    }, 3000);

    return () => clearInterval(blinkInterval);
  }, []);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const tailStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tailRotate.value}deg` }],
  }));

  const eyeStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: eyeScale.value }],
  }));

  const bgColor = BACKGROUND_ITEMS[equipped.background ?? 'white'] ?? Colors.light.primaryLight;
  const hat = HAT_ITEMS[equipped.hat ?? 'none'] ?? '';
  const outfit = OUTFIT_ITEMS[equipped.outfit ?? 'none'] ?? '';
  const accessory = ACCESSORY_ITEMS[equipped.accessory ?? 'none'] ?? '';

  // Cat mood based on streak
  const catEmoji = streak >= 30 ? '😸' : streak >= 7 ? '😺' : streak >= 1 ? '🐱' : '😿';

  return (
    <Pressable onPress={onPress ?? (() => router.push('/avatar-shop' as any))}>
      <View style={[styles.container, { width: containerSize, height: containerSize, backgroundColor: bgColor }]}>

        {/* Hat */}
        {hat ? (
          <Text style={[styles.hat, { fontSize: catSize * 0.35 }]}>{hat}</Text>
        ) : null}

        {/* Cat body */}
        <Animated.View style={[styles.catWrapper, bodyStyle]}>
          <Text style={{ fontSize: catSize }}>{catEmoji}</Text>
        </Animated.View>

        {/* Outfit badge */}
        {outfit ? (
          <Text style={[styles.outfit, { fontSize: catSize * 0.3 }]}>{outfit}</Text>
        ) : null}

        {/* Tail */}
        <Animated.Text style={[styles.tail, tailStyle, { fontSize: catSize * 0.28 }]}>
          🐾
        </Animated.Text>

        {/* Accessory (top right) */}
        {accessory ? (
          <Text style={[styles.accessory, { fontSize: catSize * 0.28 }]}>{accessory}</Text>
        ) : null}

        {/* Recovery points badge */}
        <View style={styles.pointsBadge}>
          <Text style={styles.pointsText}>⚡{recoveryPoints}</Text>
        </View>
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
  hat: {
    position: 'absolute',
    top: 4,
    zIndex: 2,
  },
  catWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  outfit: {
    position: 'absolute',
    bottom: 20,
    left: 8,
    zIndex: 2,
  },
  tail: {
    position: 'absolute',
    bottom: 4,
    right: 8,
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
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  pointsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  shopHint: {
    textAlign: 'center',
    color: Colors.light.textMuted,
    fontSize: 11,
    marginTop: Spacing.xs,
  },
});
