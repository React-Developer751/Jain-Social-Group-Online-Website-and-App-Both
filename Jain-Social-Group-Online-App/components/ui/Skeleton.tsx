import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View, type ViewStyle } from "react-native";
import { Colors } from "@/constants/theme";

/**
 * Placeholder shapes shown while a screen's data is on its way.
 *
 * Every list in the app used to render its "nothing here" message during the
 * very first fetch, so a slow connection looked like an empty account. These
 * stand in for the content instead, in roughly its shape, so the wait reads as
 * loading rather than as absence.
 */

/** One shimmering block. Give it the size of whatever it stands in for. */
export const SkeletonBlock = ({ style }: { style?: ViewStyle | ViewStyle[] }) => {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 750, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0.9] });

  return <Animated.View style={[styles.block, style, { opacity }]} />;
};

/** A row with an avatar and two lines: members, chats, groups, requests. */
export const SkeletonRow = () => (
  <View style={styles.row}>
    <SkeletonBlock style={styles.avatar} />
    <View style={styles.rowText}>
      <SkeletonBlock style={styles.lineWide} />
      <SkeletonBlock style={styles.lineNarrow} />
    </View>
  </View>
);

/** A feed post: byline, a couple of lines of text, and the image area. */
export const SkeletonCard = () => (
  <View style={styles.card}>
    <View style={styles.cardHead}>
      <SkeletonBlock style={styles.avatar} />
      <View style={styles.rowText}>
        <SkeletonBlock style={styles.lineWide} />
        <SkeletonBlock style={styles.lineNarrow} />
      </View>
    </View>
    <SkeletonBlock style={styles.lineFull} />
    <SkeletonBlock style={styles.lineTwoThirds} />
    <SkeletonBlock style={styles.media} />
  </View>
);

/** A tile for grids: gallery, events, groups. */
export const SkeletonTile = () => (
  <View style={styles.tile}>
    <SkeletonBlock style={styles.tileMedia} />
    <SkeletonBlock style={styles.lineWide} />
    <SkeletonBlock style={styles.lineNarrow} />
  </View>
);

/** Repeats one of the shapes above. The default count fills a phone screen. */
export const SkeletonList = ({
  count = 5,
  variant = "row"
}: {
  count?: number;
  variant?: "row" | "card" | "tile";
}) => {
  const Shape = variant === "card" ? SkeletonCard : variant === "tile" ? SkeletonTile : SkeletonRow;

  return (
    <View
      style={variant === "tile" ? styles.tileWrap : undefined}
      // Screen readers announce the wait rather than reading out empty shapes.
      accessible
      accessibilityLabel="Loading"
      accessibilityRole="progressbar"
    >
      {Array.from({ length: count }).map((_, index) => (
        <Shape key={index} />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  block: {
    backgroundColor: Colors.gray200,
    borderRadius: 8
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12
  },
  rowText: { flex: 1, gap: 8 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  lineWide: { height: 12, width: "60%" },
  lineNarrow: { height: 10, width: "35%" },
  lineFull: { height: 12, width: "92%", marginBottom: 8 },
  lineTwoThirds: { height: 12, width: "66%", marginBottom: 12 },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 14,
    gap: 4
  },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  media: { height: 180, width: "100%", borderRadius: 10 },
  tileWrap: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12 },
  tile: {
    width: "47%",
    margin: "1.5%",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 10
  },
  tileMedia: { height: 110, width: "100%", borderRadius: 8 }
});

export default SkeletonList;
