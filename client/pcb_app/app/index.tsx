import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform, Button, Text, Alert } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { AppUsabilityQA } from '../constants/AppUsabilityQA';

export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [destination, setDestination] = useState<string>('/login');
  const [isTestMode, setIsTestMode] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      try {
        let isAuto = null;
        let session = null;

        if (Platform.OS !== 'web') {
          isAuto = await SecureStore.getItemAsync('auto_login');
          session = await SecureStore.getItemAsync('user_session');
        } else {
          isAuto = localStorage.getItem('auto_login');
          session = localStorage.getItem('user_session');
        }

        console.log("== 인증 검사 시작 ==");
        console.log("자동로그인:", isAuto);
        console.log("세션 존재:", session ? "YES" : "NO");

        if (isAuto === 'true' && session && session !== "null" && session !== "undefined") {
          const parsed = JSON.parse(session);
          if (parsed && parsed.id) {
            setDestination('/(tabs)');
          } else {
            setDestination('/login');
          }
        } else {
          setDestination('/login');
        }
      } catch (error) {
        console.error("인증 검증 실패:", error);
        setDestination('/login');
      } finally {
        // QA 테스트를 위해 잠시 대기 상태를 유지할 수 있도록 변경 가능
        if (!isTestMode) setIsReady(true);
      }
    };

    validateAuth();
  }, [isTestMode]);

  // QA 테스트를 위한 화면 렌더링
  if (isTestMode) {
    return (
      <View style={styles.center}>
        <Text style={styles.qaTitle}>🛠️ 모바일 앱 사용성 QA 모드</Text>
        <View style={styles.qaButtonGroup}>
          <Button title="1. 네트워크 상태 체크 (ngrok)" onPress={() => AppUsabilityQA.testNetworkStability()} color="#2196F3" />
          <View style={styles.spacer} />
          <Button title="2. 고해상도 이미지 처리 테스트" onPress={() => AppUsabilityQA.testImageProcessing()} color="#4CAF50" />
          <View style={styles.spacer} />
          <Button title="3. 세션 강제 만료 및 리다이렉트" onPress={async () => {
            await AppUsabilityQA.testSessionRedirect();
            setIsTestMode(false); // 테스트 후 다시 인증 로직 가동
          }} color="#F44336" />
        </View>
        <Button title="QA 모드 나가기" onPress={() => setIsTestMode(false)} color="#666" />
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
        
        <View style={{ marginTop: 20 }}>
          <Button title="QA 테스트 모드 진입" onPress={() => setIsTestMode(true)} color="#FF9800" />
        </View>
      </View>
    );
  }

  return <Redirect href={destination as any} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff', padding: 20 },
  qaTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 30 },
  qaButtonGroup: { width: '100%', marginBottom: 40 },
  spacer: { height: 15 }
});