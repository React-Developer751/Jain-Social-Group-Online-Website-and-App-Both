import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Colors } from "@/constants/theme";
import { SkeletonList } from "./Skeleton";

/**
 * Decides between "still loading" and "genuinely empty".
 *
 * Screens used to render their empty message the instant they mounted, before
 * the first request had even answered, so a slow connection was indistinguishable
 * from having no data at all. Wrapping a list in this makes the difference
 * explicit: placeholders while the request is in flight, the empty message only
 * once it has come back with nothing.
 *
 *   <ScreenState loading={loading} isEmpty={items.length === 0} emptyTitle="No chats yet">
 *     {items.map(...)}
 *   </ScreenState>
 */
export const ScreenState = ({
  loading,
  isEmpty,
  children,
  variant = "row",
  count,
  emptyTitle = "Nothing here yet",
  emptyMessage,
  emptyAction
}: {
  /** True until the first request for this screen has settled. */
  loading: boolean;
  isEmpty: boolean;
  children: ReactNode;
  /** Shape of the placeholder: a list row, a feed card, or a grid tile. */
  variant?: "row" | "card" | "tile";
  count?: number;
  emptyTitle?: string;
  emptyMessage?: string;
  /** An optional button or link under the empty message. */
  emptyAction?: ReactNode;
}) => {
  if (loading) return <SkeletonList variant={variant} count={count} />;

  if (isEmpty) {
    return (
      <View style={styles.empty}>
        <Text style={styles.title}>{emptyTitle}</Text>
        {emptyMessage ? <Text style={styles.message}>{emptyMessage}</Text> : null}
        {emptyAction ? <View style={styles.action}>{emptyAction}</View> : null}
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 8
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.gray700,
    textAlign: "center"
  },
  message: {
    fontSize: 14,
    color: Colors.gray500,
    textAlign: "center",
    lineHeight: 20
  },
  action: { marginTop: 12 }
});

export default ScreenState;
