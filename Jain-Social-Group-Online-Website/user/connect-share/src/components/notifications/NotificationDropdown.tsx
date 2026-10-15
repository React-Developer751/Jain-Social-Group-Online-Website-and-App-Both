import { Heart, MessageSquare, Share2, UserPlus, Calendar, Shield, Megaphone, Bell, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NotificationItem } from '@/hooks/useNotifications';

/**
 * The bell's panel.
 *
 * A count tells a member that three things happened. This tells them which
 * three, and lets them go to the thing itself.
 */

const typeIcon: Record<string, typeof Heart> = {
  like: Heart,
  comment: MessageSquare,
  share: Share2,
  friend_request: UserPlus,
  friend_accept: UserPlus,
  friend_cancel: UserPlus,
  event: Calendar,
  announcement: Megaphone,
  admin: Shield
};

const typeColor: Record<string, string> = {
  like: 'text-red-500',
  comment: 'text-blue-500',
  share: 'text-green-500',
  friend_request: 'text-primary',
  friend_accept: 'text-primary',
  friend_cancel: 'text-muted-foreground',
  event: 'text-amber-500',
  announcement: 'text-rose-500',
  admin: 'text-purple-500'
};

/** The club speaks as itself for announcements and events. */
const isFromClub = (type: string) => type === 'announcement' || type === 'event';

/**
 * Who to show on the row.
 *
 * The field names read backwards for some types, and this matches the rule
 * the server uses: for a like, a comment, or an accepted or cancelled
 * request, `sender` is the member being told and `receiver` is the one who
 * acted, so the face to show is the other side.
 */
const otherParty = (n: NotificationItem) =>
  ['like', 'comment', 'friend_accept', 'friend_cancel'].includes(n.type) ? n.receiver : n.sender;

/** Where the row should take you. */
const destinationFor = (n: NotificationItem) => {
  if (n.type === 'announcement') return '/announcements';
  if (n.type === 'event') return '/events';
  if (n.type === 'friend_request') return '/friends';
  if (n.type === 'friend_accept' || n.type === 'friend_cancel') return '/friends';
  return '/home';
};

const whenLabel = (n: NotificationItem) => {
  const raw = n.date || n.createdAt;
  if (!raw) return '';

  const at = new Date(raw);
  if (Number.isNaN(at.getTime())) return '';

  const minutes = Math.round((Date.now() - at.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`;

  return at.toLocaleDateString();
};

interface Props {
  onClose: () => void;
  notifications: NotificationItem[];
  loading?: boolean;
}

export function NotificationDropdown({ onClose, notifications, loading = false }: Props) {
  const navigate = useNavigate();

  const open = (n: NotificationItem) => {
    onClose();
    navigate(destinationFor(n));
  };

  return (
    <>
      {/* Catches a click anywhere else so the panel closes. */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-xl bg-card border border-border shadow-elevated animate-fade-in overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="font-heading font-semibold text-foreground">Notifications</h3>
        </div>

        <div className="max-h-80 overflow-y-auto flex flex-col">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground gap-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <Bell className="h-8 w-8 opacity-40" />
              <p className="text-sm">Nothing new yet</p>
            </div>
          ) : (
            notifications.map((n) => {
              const person = otherParty(n);
              const Icon = typeIcon[n.type] ?? Bell;

              return (
                <button
                  key={n._id}
                  onClick={() => open(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${
                    !n.isRead ? 'bg-primary/5' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    {isFromClub(n.type) ? (
                      <div className="h-10 w-10 rounded-full gradient-primary text-primary-foreground flex items-center justify-center font-semibold">
                        A
                      </div>
                    ) : (
                      <img
                        src={person?.profileImage || 'https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2'}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    )}
                    {/* The icon says what kind of thing happened at a glance. */}
                    <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center">
                      <Icon className={`h-3 w-3 ${typeColor[n.type] ?? 'text-muted-foreground'}`} />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">
                        {isFromClub(n.type) ? 'Admin' : person?.fullName || 'Someone'}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground break-words">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{whenLabel(n)}</p>
                  </div>

                  {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export default NotificationDropdown;
