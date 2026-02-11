import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, ScrollView, ViewStyle, TextStyle } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '../../../constants/Config';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

export default function AuthIndexScreen() {
  const router = useRouter();
  const isFocused = useIsFocused(); 
  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    if (isFocused) {
      loadUserInfo();
    }
  }, [isFocused]);

  const loadUserInfo = async () => {
    try {
      let session = null;
      if (Platform.OS !== 'web') {
        session = await SecureStore.getItemAsync('user_session');
      } else {
        session = localStorage.getItem('user_session');
      }

      if (session) {
        const parsedData = JSON.parse(session);
        console.log("현재 로드된 유저 정보:", parsedData);
        setUserInfo(parsedData);
      }
    } catch (e) {
      console.error("User Info Load Error:", e);
    }
  };

  const handleLogout = async () => {
    Alert.alert("로그아웃", "정말 로그아웃 하시겠습니까?", [
      { text: "취소", style: "cancel" },
      { 
        text: "로그아웃", 
        onPress: async () => {
          try {
            await axios.post(`${API_URL}/logout/`, {}, { withCredentials: true });
            
            if (Platform.OS !== 'web') {
              await SecureStore.deleteItemAsync('user_session');
              await SecureStore.deleteItemAsync('auto_login'); // 자동로그인도 해제
            } else {
              localStorage.removeItem('user_session');
              localStorage.removeItem('auto_login');
            }
            router.replace('/login');
          } catch (error) {
            Alert.alert("오류", "로그아웃 처리에 실패했습니다.");
          }
        }
      }
    ]);
  };

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.headerCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={40} color="#fff" />
        </View>
        <Text style={styles.userName}>{userInfo?.name || '사용자'}</Text>
        <Text style={styles.userEmail}>{userInfo?.email || '이메일 정보 없음'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>계정 설정</Text>
        
        <TouchableOpacity 
          style={styles.menuItem} 
          onPress={() => router.push('/(tabs)/auth/edit' as any)}
        >
          <Ionicons name="pencil-outline" size={20} color="#333" />
          <Text style={styles.menuText}>회원 정보 수정</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={[styles.menuText, { color: '#FF3B30' }]}>로그아웃</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>부서</Text>
          <Text style={styles.infoValue}>{userInfo?.dept_name || '부서 미지정'}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>권한</Text>
          <Text style={styles.infoValue}>{userInfo?.role || '-'}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' } as ViewStyle,
  headerCard: { 
    backgroundColor: '#fff', 
    alignItems: 'center', 
    paddingTop: 50,
    paddingBottom: 40,
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  } as ViewStyle,
  avatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: '#007AFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15 
  } as ViewStyle,
  userName: { fontSize: 22, fontWeight: 'bold', color: '#333' } as TextStyle,
  userEmail: { fontSize: 14, color: '#888', marginTop: 5 } as TextStyle,
  section: { 
    backgroundColor: '#fff', 
    marginTop: 15, 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderTopWidth: 1, 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  } as ViewStyle,
  sectionTitle: { 
    fontSize: 13, 
    color: '#007AFF', 
    fontWeight: 'bold', 
    marginBottom: 10, 
    textTransform: 'uppercase' 
  } as TextStyle,
  menuItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f9f9f9' 
  } as ViewStyle,
  menuText: { fontSize: 16, marginLeft: 15, color: '#333' } as TextStyle,
  infoSection: {
    marginTop: 20,
    paddingHorizontal: 25,
  } as ViewStyle,
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  } as ViewStyle,
  infoLabel: { color: '#999', fontSize: 14 } as TextStyle,
  infoValue: { color: '#555', fontSize: 14, fontWeight: '500' } as TextStyle
});