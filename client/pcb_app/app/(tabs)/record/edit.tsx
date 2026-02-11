import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../../constants/Config'; 

// 프로젝트 생성 화면
export default function RecordEdit() {
  const params = useLocalSearchParams();
  const { id, model_name, from } = params;
  const router = useRouter();
  
  const [userInfo, setUserInfo] = useState<any>(null);
  const [newModelName, setNewModelName] = useState('');
  const [loading, setLoading] = useState(true);

  axios.defaults.withCredentials = true;

  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        let savedInfo = null;
        if (Platform.OS !== 'web') {
          savedInfo = await SecureStore.getItemAsync('user_session');
        } else {
          savedInfo = localStorage.getItem('user_session');
        }

        if (savedInfo) {
          setUserInfo(JSON.parse(savedInfo));
        }
      } catch (e) {
        console.error("세션 로드 실패:", e);
      } finally {
        setLoading(false);
      }
    };
    loadUserInfo();
  }, []);

  const handleCreateProject = async () => {
    if (!newModelName.trim()) {
      Alert.alert("알림", "모델명을 입력해주세요.");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/projects/`, {
        model_name: newModelName,
      }, { withCredentials: true });

      if (response.data.status === 'success') {
        Alert.alert("성공", "새 프로젝트가 등록되었습니다.");
        router.replace('/(tabs)/record');
      }
    } catch (error) {
      Alert.alert("등록 실패", "서버 오류가 발생했습니다.");
    }
  };

  return (
    <View style={styles.mainContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerLeft} 
          onPress={() => {
            if (from) {
              router.replace(from as any);
            } else {
              router.back();
            }
          }}
        >
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>프로젝트 등록</Text>
        </View>

        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>담당자: {userInfo?.name || '로드 중...'}</Text>
          <Text style={styles.infoText}>소속: {userInfo?.dept_name || '부서 없음'}</Text>
          <Text style={styles.infoText}>권한: {userInfo?.role || '-'}</Text>
        </View>

        <View style={styles.hr} />

        <View style={styles.section}>
          <Text style={styles.label}>새 프로젝트 등록</Text>
          <TextInput
            style={styles.input}
            placeholder="모델명을 입력하세요"
            value={newModelName}
            onChangeText={setNewModelName}
          />
          
          <TouchableOpacity 
            style={styles.button} 
            onPress={handleCreateProject}
          >
            <Text style={styles.buttonText}>DB 프로젝트 생성</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#fff' },
  container: { flexGrow: 1, padding: 20 },
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
    width: 60,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  infoSection: { marginBottom: 15, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 8 },
  infoText: { fontSize: 13, color: '#555', marginBottom: 2 },
  hr: { height: 1, backgroundColor: '#eee', marginBottom: 20 },
  section: { marginBottom: 30 },
  label: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 15, borderRadius: 10, fontSize: 16, marginBottom: 15 },
  button: { backgroundColor: '#007AFF', padding: 16, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});