import { Redirect } from "expo-router";

// The route guard in _layout.tsx handles auth-based routing.
// This file just handles the initial "/" path by redirecting to tabs.
// If the user isn't authenticated, the route guard will intercept and
// redirect to sign-in before tabs renders.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
