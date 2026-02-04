import React, { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router'; // [수정] Stack, useRouter 추가
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useIsFocused } from '@react-navigation/native';

/** [식별명: 탭 메인홈] 화면이 포커스될 때마다 최신 세션 정보를 로드합니다. */
export default function TabHomeScreen() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const isFocused = useIsFocused(); // 현재 화면이 활성화되었는지 여부 확인

  // isFocused가 true가 될 때(화면이 보일 때)마다 실행
  useEffect(() => {
    if (isFocused) {
      loadData();
    }
  }, [isFocused]);

  const loadData = async () => {
    try {
      let session = null;
      if (Platform.OS !== 'web') {
        session = await SecureStore.getItemAsync('user_session');
      } else {
        session = localStorage.getItem('user_session');
      }
      
      if (session) {
        // 저장소에 있는 최신 정보를 상태에 반영
        setUserInfo(JSON.parse(session));
      }
    } catch (e) {
      console.error("데이터 로드 실패:", e);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Home</Text>
        </View>
        <View style={styles.headerRight} />
      </View>
      <View style={styles.content}>
        {userInfo ? (
          <>
            <Text style={styles.welcomeText}>{userInfo.name} 님, 반갑습니다!</Text>
            <View style={styles.card}>
              <Text style={styles.infoLabel}>사용자 정보 요약</Text>
              <Text style={styles.infoText}>소속법인: {userInfo.company_name || '정보 없음'}</Text>
              <Text style={styles.infoText}>이름: {userInfo.name}</Text>
              <Text style={styles.infoText}>부서: {userInfo.dept_name || '미지정'}</Text>
              <Text style={styles.infoText}>권한: {userInfo.role}</Text>
            </View>
          </>
        ) : (
          <ActivityIndicator color="#007AFF" />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 0, backgroundColor: '#fff', flexGrow: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 15, 
    paddingTop: 50, 
    paddingBottom: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff'
  },
  headerLeft: {
    width: 70, // headerRight와 동일한 너비로 설정하여 완벽한 중앙 정렬
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 70, // headerLeft와 동일한 너비
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  content: {padding: 20, backgroundColor: '#f8f9fa', flexGrow: 1 },
  welcomeText: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  infoLabel: { fontSize: 14, color: '#007AFF', fontWeight: 'bold', marginBottom: 15 },
  infoText: { fontSize: 16, color: '#444', marginBottom: 8 }
});