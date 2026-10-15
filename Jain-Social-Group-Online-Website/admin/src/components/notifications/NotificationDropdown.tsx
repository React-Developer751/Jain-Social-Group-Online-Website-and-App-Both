import { Lightbulb, UserPlus, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import socket from '@/socket/socket';
import { useEffect } from 'react';

/**
 * The administrator's bell panel.
 *
 * Only two things reach an admin: a member sent a suggestion, and a new member
 * registered. Both now open the page where that thing can be acted on, the
 * same way the member side behaves. Before, the rows were plain text with no
 * click handler, so seeing a suggestion told you it existed and left you to
 * find it yourself.
 */

const typeIcon: Record<string, typeof Bell> = {
  suggestion: Lightbulb,
  new_user: UserPlus
};

const typeColor: Record<string, string> = {
  suggestion: 'text-emerald-500',
  new_user: 'text-primary'
};

/** Where each kind of notification should take the administrator. */
const destinationFor = (type: string) =>
  type === 'suggestion' ? '/dashboard/suggestions' : '/dashboard/members';

const whenLabel = (raw?: string) => {
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
  notifications: any[];
  notifOpen: boolean;
}

export function NotificationDropdown({ notifOpen, onClose, notifications }: Props) {
  const user = JSON.parse(localStorage.getItem("admin.user"));
  const navigate = useNavigate();

  /* Read straight from the prop. This used to be copied into state once, so
     a notification arriving over the socket while the panel was open never
     appeared, and reopening showed the same stale list. */
  const visible = (notifications ?? []).filter(
    (n) => n?.type === "suggestion" || n?.type === "new_user"
  );

  useEffect(() => {
    if (notifOpen === true) {
      socket.emit("notificationSeen", user?._id);
    }
  }, [notifOpen])

  const open = (n: any) => {
    onClose();
    navigate(destinationFor(n?.type));
  };

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-xl bg-card border border-border shadow-elevated animate-fade-in overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-heading font-semibold text-foreground">Notifications</h3>
        </div>

        <div className="max-h-72 overflow-y-auto flex flex-col">
          {visible.length > 0 ? (
            visible.map((n) => {
              const userToShow = n.sender;
              const Icon = typeIcon[n.type] ?? Bell;

              return (
                <button
                  key={n._id}
                  onClick={() => open(n)}
                  className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0 ${
                    !n.isRead ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="relative shrink-0">
                    <img
                      src={userToShow?.profileImage || "https://imgs.search.brave.com/xCedoimthG97d8n6Aqc-6LyqR2Oa5N-3B_5XNwx_Hqc/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly91cGxv/YWQud2lraW1lZGlh/Lm9yZy93aWtpcGVk/aWEvY29tbW9ucy9h/L2FjL0RlZmF1bHRf/cGZwLmpwZz9fPTIw/MjAwNDE4MDkyMTA2"}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                    {/* Says at a glance which kind of thing this is. */}
                    <span className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-card border border-border flex items-center justify-center">
                      <Icon className={`h-3 w-3 ${typeColor[n.type] ?? 'text-muted-foreground'}`} />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{userToShow?.fullName || "Someone"}</span>
                    </p>
                    <p className="text-sm text-muted-foreground break-words">{n?.message}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{whenLabel(n?.date || n?.createdAt)}</p>
                  </div>

                  {!n.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                </button>
              );
            })
          ) : (
            /* Shown when the list is empty and also when it holds only rows
               an admin never sees. The filter used to leave a blank panel. */
            <div className="flex flex-col items-center justify-center h-56 text-muted-foreground gap-2">
              <Bell className="h-8 w-8 opacity-40" />
              <p className="text-sm">No notifications found.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default NotificationDropdown;
