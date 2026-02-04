import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import { Redirect } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

/** [식별명: 루트 진입점] 
 * 자동 로그인 여부와 실제 세션 데이터 존재 여부를 엄격하게 체크하여 
 * 로그인하지 않은 사용자는 절대로 (tabs) 내부로 진입할 수 없게 차단합니다.
 */
export default function Index() {
  const [isReady, setIsReady] = useState(false);
  const [destination, setDestination] = useState<string>('/login');

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

        // [중요] 세션이 문자열 "null"이거나 비어있는 경우를 대비한 방어 로직
        if (isAuto === 'true' && session && session !== "null" && session !== "undefined") {
          const parsed = JSON.parse(session);
          // 세션 데이터 내부에 id가 실재하는지 한 번 더 확인
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
        setIsReady(true);
      }
    };

    validateAuth();
  }, []);

  if (!isReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  // replace 속성을 사용하여 히스토리에 남지 않게 강제 이동
  return <Redirect href={destination as any} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }
});