import React from 'react';
import { Stack } from 'expo-router';

/** [식별명: 루트 레이아웃] 
 * 초기 진입점(index)이 가장 먼저 평가되도록 순서를 조정했습니다.
 */
export default function RootLayout() {
  return (
    <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' }
      }}>
      
      {/* [수정] index를 상단에 배치하여 앱 구동 시 권한 체크 로직이 우선 실행되도록 함 */}
      <Stack.Screen name="index" />
      
      {/* 1. 하단 탭 바 그룹 */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      
      {/* 2. 인증 관련 화면 */}
      <Stack.Screen name="login" options={{ title: '로그인' }} />
      <Stack.Screen name="signup" options={{ title: '회원가입' }} />
    </Stack>
  );
}