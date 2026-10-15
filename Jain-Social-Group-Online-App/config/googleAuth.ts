import { GoogleSignin } from '@react-native-google-signin/google-signin';

/**
 * Google sign-in setup, run once for the whole app.
 *
 * This used to call `configure` unconditionally at import time. The client ids
 * come from build-time environment variables, and when one of them is missing
 * the library throws "offline use requires server web ClientID" right there.
 * Because the login screen imports this file, that error took down the entire
 * login screen: not just Google sign-in, but email and Apple too, leaving a
 * red error screen and no way into the app at all.
 *
 * A missing id now switches Google sign-in off instead, and everything else on
 * the screen keeps working. The same rule the server already follows for its
 * optional integrations: unset means off, never broken.
 */

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

/** False when this build has no Google client id. Hide the button on it. */
export const googleSignInConfigured = Boolean(webClientId);

if (googleSignInConfigured) {
  GoogleSignin.configure({
    webClientId,
    iosClientId,
    // Needs the web client id, which is why this is inside the guard.
    offlineAccess: true,
  });
} else {
  console.warn(
    'Google sign-in is disabled: EXPO_PUBLIC_GOOGLE_CLIENT_ID was not set when this build was made.'
  );
}

export const signInWithGoogle = async () => {
  if (!googleSignInConfigured) {
    throw new Error('Google sign-in is not available in this build.');
  }

  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    // Check if token exists
    const idToken = response.data?.idToken;
    if (!idToken) {
      throw new Error("Google ID Token not found");
    }

    return idToken; // Token return kar rahe hain taaki screen par use ho sake
  } catch (error) {
    console.error("Google Login Error helper me:", error);
    throw error;
  }
};
