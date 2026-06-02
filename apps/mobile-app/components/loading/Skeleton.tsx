import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated, ViewStyle } from "react-native";
import { Colors } from "@/lib/constants";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  style,
}: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.gray[200],
          opacity,
        },
        style,
      ]}
    />
  );
}

export function CardSkeleton({ style }: { style?: ViewStyle }) {
  return (
    <View style={[skeletonStyles.card, style]}>
      <Skeleton
        width='60%'
        height={18}
      />
      <Skeleton
        width='40%'
        height={14}
        style={{ marginTop: 10 }}
      />
      <Skeleton
        width='80%'
        height={14}
        style={{ marginTop: 8 }}
      />
    </View>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <View style={skeletonStyles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <CardSkeleton
          key={i}
          style={{ marginBottom: 12 }}
        />
      ))}
    </View>
  );
}

export function ScreenSkeleton() {
  return (
    <View style={skeletonStyles.screen}>
      <Skeleton
        width='50%'
        height={24}
      />
      <Skeleton
        width='30%'
        height={14}
        style={{ marginTop: 8 }}
      />
      <View style={{ marginTop: 24 }}>
        <ListSkeleton count={4} />
      </View>
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 18,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  list: {
    gap: 0,
  },
  screen: {
    flex: 1,
    padding: 16,
    paddingTop: 20,
  },
});
