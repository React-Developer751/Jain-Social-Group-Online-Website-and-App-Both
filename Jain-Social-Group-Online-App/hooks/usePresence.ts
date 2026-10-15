import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPresenceVersion, subscribePresence, isUserOnline } from "@/socket/socket";

/**
 * Live "is this member online right now" for any screen.
 *
 * Reads the presence set the socket module keeps, and re-renders the component
 * whenever it changes. Screens used to show whatever `isOnline` the API had
 * baked into the list when it was fetched, so a member coming online during
 * the session never lit up until the next refresh.
 *
 *   const online = usePresence();
 *   <Avatar isOnline={online(friend._id)} />
 *
 * Your own avatar never gets a dot. The server counts you among the connected
 * members, which is true but says nothing: a dot answers "can I reach this
 * person", and you are always here. It is handled once here rather than at the
 * ten call sites that draw an avatar, so a new screen cannot forget it.
 */
export const usePresence = () => {
  // The version changes on every presence update, including one member
  // replacing another, which a size comparison would miss.
  const version = useSyncExternalStore(subscribePresence, getPresenceVersion, () => 0);

  const [selfId, setSelfId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem("user")
      .then((raw) => {
        if (cancelled || !raw) return;
        setSelfId(JSON.parse(raw)?._id ?? null);
      })
      .catch(() => {
        // Not signed in, or unreadable storage. Everyone else still lights up.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return useCallback(
    (userId?: string | null) => {
      if (!userId) return false;
      if (selfId && String(userId) === String(selfId)) return false;
      return isUserOnline(userId);
    },
    [version, selfId]
  );
};

export default usePresence;
