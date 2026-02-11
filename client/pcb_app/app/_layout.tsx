import React from 'react';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' }
      }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ title: '로그인' }} />
      <Stack.Screen name="signup" options={{ title: '회원가입' }} />
    </Stack>
  );
}