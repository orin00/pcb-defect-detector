import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, TextInput, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { API_URL } from '../../../constants/Config';
import { Ionicons } from '@expo/vector-icons';

/** [식별명: 회원정보 수정 페이지] */
export default function EditProfileScreen() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<any>(null);
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');

  useEffect(() => {
    const loadData = async () => {
      let session = null;
      if (Platform.OS !== 'web') {
        session = await SecureStore.getItemAsync('user_session');
      } else {
        session = localStorage.getItem('user_session');
      }
      if (session) {
        const parsed = JSON.parse(session);
        setUserInfo(parsed);
        setName(parsed.name || '');
        setDept(parsed.dept_name || '');
      }
    };
    loadData();
  }, []);

  const handleUpdate = async () => {
    if (!name.trim()) {
      Alert.alert("알림", "이름을 입력해주세요.");
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/update-profile/`, {
        user_id: userInfo.id,
        name: name,
        dept_name: dept,
      });

      // 변경 사항이 없을 경우
      if (response.data.status === 'no_change') {
        Alert.alert("알림", "변경된 내용이 없습니다.");
        return; // 함수 종료 (이전 화면으로 돌아가지 않음)
      }

      // 변경 성공 시
      if (response.data.status === 'success') {
        const updatedInfo = JSON.stringify(response.data.user_info);
        if (Platform.OS !== 'web') {
          await SecureStore.setItemAsync('user_session', updatedInfo);
        } else {
          localStorage.setItem('user_session', updatedInfo);
        }

        Alert.alert("성공", "정보가 수정되었습니다.", [
          { text: "확인", onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error(error);
      Alert.alert("오류", "서버 통신에 실패했습니다.");
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/auth')}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>회원 정보 수정</Text>
        <TouchableOpacity onPress={handleUpdate}>
          <Text style={styles.completeText}>완료</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.form}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>이름</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="이름 입력"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>부서</Text>
          <TextInput
            style={styles.input}
            value={dept}
            onChangeText={setDept}
            placeholder="부서 입력"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>이메일 (수정 불가)</Text>
          <Text style={styles.disabledText}>{userInfo?.email}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 50, 
    paddingBottom: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee',
    backgroundColor: '#fff' // 배경색 명시
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  completeText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },
  form: { padding: 20 },
  inputGroup: { marginBottom: 25 },
  label: { fontSize: 13, color: '#999', marginBottom: 8 },
  input: { fontSize: 16, borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 8, color: '#333' },
  disabledText: { fontSize: 16, color: '#bbb', paddingTop: 8 }
});