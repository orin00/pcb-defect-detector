import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';


// 로그인된 유저의 권한이 DIRECTOR or MANAGER면 멤버관리 표시
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
          setUserRole(parsed.role); // 세션에서 권한 꽂아서 전달
        }
      } catch (e) {
        console.error("Role Load Error:", e);
      }
    };
    getRole();
  }, []);

  // 관리자 권한 확인
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
        name="auth/index"
        options={{
          title: '내 정보',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={24} color={color} />,
        }}
      />

      <Tabs.Screen
        name="member/index"
        options={{
          title: '멤버관리',
          href: isAdmin ? '/member' : null, 
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />
      
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