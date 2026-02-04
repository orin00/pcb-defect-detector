import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** [식별명: 탭 레이아웃 권한 제어본] 
 * 로그인된 유저의 권한이 DIRECTOR 또는 MANAGER일 때만 '멤버관리' 탭을 표시합니다.
 */
export default function TabLayout() {
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const getRole = async () => {
      try {
        let session = null;
        if (Platform.OS !== 'web') {
          session = await SecureStore.getItemAsync('user_session');
        } else {
          session = localStorage.getItem('user_session');
        }

        if (session) {
          const parsed = JSON.parse(session);
          setUserRole(parsed.role); // 세션에서 권한(role) 추출
        }
      } catch (e) {
        console.error("Role Load Error:", e);
      }
    };
    getRole();
  }, []);

  // 관리자 권한 여부 확인 (DIRECTOR 또는 MANAGER)
  const isAdmin = userRole === 'DIRECTOR' || userRole === 'MANAGER';

  return (
    <Tabs screenOptions={{ 
      tabBarActiveTintColor: '#007AFF',
      headerShown: true, 
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '홈',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      
      <Tabs.Screen
        name="ai/index"
        options={{
          title: 'AI 분석',
          tabBarIcon: ({ color }) => <Ionicons name="scan-outline" size={24} color={color} />,
        }}
      />

      <Tabs.Screen 
        name="ai/upload" 
        options={{ 
          href: null,
          tabBarStyle: { display: 'none' },
          headerShown: false,
        }} 
      />

      <Tabs.Screen
        name="record/index"
        options={{
          title: '프로젝트',
          tabBarIcon: ({ color }) => <Ionicons name="folder-open-outline" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="record/edit"
        options={{ href: null, tabBarStyle: { display: 'none' }, headerShown: false }}
      />
      
      <Tabs.Screen
        name="calender/index"
        options={{
          title: '일정',
          tabBarIcon: ({ color }) => <Ionicons name="calendar-outline" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="auth/index"
        options={{
          title: '내 정보',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />

      {/* [수정] 권한에 따른 멤버관리 탭 노출 제어 */}
      <Tabs.Screen
        name="member/index"
        options={{
          title: '멤버관리',
          href: isAdmin ? '/(tabs)/member' : null, // 권한 없으면 탭 바에서 제거
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />
      
      {/* 상세 페이지들 숨김 처리 */}
      <Tabs.Screen
        name="member/edit"
        options={{ href: null, tabBarStyle: { display: 'none' }, headerShown: false }}
      />
      <Tabs.Screen
        name="auth/edit"
        options={{ href: null, tabBarStyle: { display: 'none' }, headerShown: false }}
      />
      <Tabs.Screen
        name="record/records"
        options={{ href: null, tabBarStyle: { display: 'none' }, headerShown: false }}
      />
      <Tabs.Screen
        name="record/content"
        options={{ href: null, tabBarStyle: { display: 'none' }, headerShown: false }}
      />
    </Tabs>
  );
}