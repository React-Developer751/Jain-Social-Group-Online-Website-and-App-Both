# App Store rejection — app-side fixes (Submission 74c6ee22-8a6d-4b18-b667-9b6fcabaf59f)

Reviewed 26 August 2026 · version 1.0 (5) · iPhone 17 Pro Max + iPad Air 11" (M3), iOS 26.6

---

## 0. ROOT CAUSE of "Sign in with Apple returned an error" — a one-character config mismatch

| Where | Value |
|---|---|
| This app — `app.json` → `ios.bundleIdentifier` | `com.infonicsolutions.jainsocialgroup.app` |
| Backend — `APPLE_BUNDLE_ID` on the server | `com.infonicsolutions.jainsocialgroup` |

Apple puts the bundle identifier into the `aud` claim of the identity token. The server
verifies that token against `APPLE_BUNDLE_ID`; because the two strings differ (the
server's value is missing the `.app` suffix), verification **always** fails, the old code
turned that into a blanket HTTP 500, and the app showed "Sign in with Apple returned an
error". It would have failed for every reviewer, on every device, every time.

**Fix: on the server set**

```
APPLE_BUNDLE_ID=com.infonicsolutions.jainsocialgroup.app
```

Do not change the bundle identifier in the app — it is already published under that id.

**Second, related mismatch — Google sign-in on iOS.** `app.json` configures the Google
plugin with `iosUrlScheme: com.googleusercontent.apps.920750642218-jj9q26ncttusf6ht2g8g5fduttc1jatm`,
i.e. Google Cloud project **920750642218**, while the server only knows the web and
Android client ids from project **721894152638**. The iOS id_token's `aud` is therefore
unknown to the server. The backend now accepts several client ids; add to the server:

```
GOOGLE_IOS_CLIENT_ID=920750642218-jj9q26ncttusf6ht2g8g5fduttc1jatm.apps.googleusercontent.com
```

If the app and the backend really are meant to use two different Google projects, verify
that is intentional — normally they share one.

---

## 1. Guideline 2.1(a) — Sign in with Apple  (`app/login.tsx`)

* Uses Apple's own `AppleAuthenticationButton` (black, `SIGN_IN`) instead of a custom
  icon button. A custom button is itself a rejection reason under Apple's HIG.
* `isAvailableAsync()` is checked before the flow and the button is only rendered when
  Sign in with Apple is supported.
* `credential.email` is now sent along with the name. Apple returns both **only on the
  first authorisation**; on later sign-ins they are null and the server matches the
  account on the Apple user id inside the token.
* A missing `identityToken` now shows a real message instead of silently returning.
* `ERR_REQUEST_CANCELED` stays silent (unchanged) — cancelling is not an error.
* A member whose account is still awaiting the administrator's approval sees
  "Membership pending approval" instead of an error. The server sends
  `pendingApproval: true` for that case.

`ios.usesAppleSignIn: true` and `supportsTablet: false` were already correct in
`app.json`.

## 2. Guideline 1.2 — user-generated content

**EULA before registering or logging in** — this was the actual gap. The terms text
already existed (`app/termsAndConditionsScreen.tsx`, with the ZERO TOLERANCE clause), but:

* the login screen showed no agreement at all, and
* the register screen's checkbox was never enforced — `handleRegister` ignored
  `acceptedTerms` and never sent it to the server.

Now:

* `app/login.tsx` shows "I have read and agree to the Terms of Use (EULA) & Community
  Guidelines. There is no tolerance for objectionable content or abusive users." above
  the sign-in buttons, with a tappable link to the full terms. **Email/password, Google
  and Apple sign-in are all blocked until it is ticked**, and an explanatory alert with a
  "Read Terms" action appears if a member tries anyway.
* `app/register.tsx` refuses to create the account until the box is ticked, with an
  inline error, and sends `termsAccepted: true`. The server records
  `termsAccepted` / `termsAcceptedAt` / `termsVersion` on the account.

**Flag objectionable content** (already present, now stronger)

* Post ⋯ menu → *Report Post* (reason list) — after reporting, the post disappears from
  the feed immediately and the confirmation says the team reviews it within 24 hours.
* Post ⋯ menu → *Hide Post* — new; removes a single post from your own feed at once.
* Member profile ⋯ → *Report* (`reportType: "user"`).

**Block abusive users** (already present)

* Post ⋯ menu → *Block User*; member profile → *Block*; Settings → Blocked Accounts
  lists them with *Unblock*.
* Unblocking was broken server-side for anyone blocked from a profile or a post (it
  always answered 404 "Chat not found"); that is fixed in the backend repo.

## 3. Guideline 5.1.1(v) — required personal information  (`app/register.tsx`)

Registration previously refused to continue without **Address, City, State, Marital
status, Occupation and Mobile**. Now the only required fields are:

* Full name
* An email address **or** a mobile number
* Password (min 6 characters) + confirmation

Address, City, State, Marital status, Occupation, Date of birth and Gender are labelled
**(Optional)**, step 2 carries the note "Address and marital status are optional — you
can leave them empty", and the account is created with them blank. The backend enforces
the same minimum.

## 4. iPhone 12 and above / iPad

* `ios.supportsTablet` is `false`, so the app is an iPhone app and is no longer reviewed
  on iPad.
* Added `expo-build-properties` → `ios.deploymentTarget: "16.0"`. Apple has no
  "iPhone 12 or newer" switch — supported devices follow the minimum iOS version.
  16.0 covers iPhone 8 and newer, which includes every device you asked about. If you
  want to be stricter, `"18.0"` limits it to iPhone XR/11 and newer, the closest Apple
  allows to "iPhone 12+".
* Both need a fresh native build: `eas build -p ios --profile production`.

---

## 5. Before resubmitting

1. **Server:** deploy the backend commit and set `APPLE_BUNDLE_ID=com.infonicsolutions.jainsocialgroup.app`
   plus `GOOGLE_IOS_CLIENT_ID`. Verify:
   `curl -i -X POST https://paleturquoise-grouse-738272.hostingersite.com/api/user/auth/apple-mobile -H "Content-Type: application/json" -d "{}"`
   must answer **400**, not 500.
2. **App:** `eas build -p ios --profile production` and submit the new build. Make sure
   `EXPO_PUBLIC_BACKEND_URL` points at the deployed API.
3. **Test on a physical iPhone**, in this order: fresh install → tick the EULA →
   Sign in with Apple → sign out → **Sign in with Apple again** (Apple sends no name or
   email the second time) → also try "Hide My Email".
4. **Record the screen** (physical device, one take) — Apple asked for this explicitly:
   * the EULA agreement on the login screen, opening the terms, showing the
     zero-tolerance paragraph, ticking the box;
   * Sign in with Apple succeeding;
   * post ⋯ → Report → reason → the post disappearing;
   * profile → Block → the member's content disappearing, then Settings → Blocked
     Accounts;
   * the sign-up form with Address and Marital status marked Optional, registering with
     both empty.
5. Paste the recording link into **App Store Connect → App Review Information → Notes**,
   and provide a demo account that is already approved by the admin.
6. Set the EULA URL in App Store Connect to
   `https://paleturquoise-grouse-738272.hostingersite.com/legal/terms`.

The reply text for App Review is in the backend repo: `APPLE_REVIEW_FIXES.md`, section F.
