import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../constants/Config';
import { Ionicons } from '@expo/vector-icons';

// 회원가입 페이지
export default function SignUpScreen() {
  const router = useRouter();
  const [formData, setFormData] = useState({ 
    corporate_name: '', 
    name: '', 
    email: '', 
    password: '', 
    role: 'STAFF', 
    dept_name: ''
  });

  const handleSignUp = async () => {
    try {
      // 빈 값 검증
      if (!formData.corporate_name || !formData.name || !formData.email || !formData.password) {
        Alert.alert("알림", "필수 항목을 모두 입력해주세요.");
        return;
      }

      const response = await axios.post(`${API_URL}/signup/`, formData);
      if (response.status === 201 || response.status === 200) {
        Alert.alert("성공", "가입이 완료되었습니다.");
        router.replace('/login');
      }
    } catch (error) {
      Alert.alert("실패", "데이터를 다시 확인해 주세요.");
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerText}>회원가입</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <TextInput 
          style={styles.input} 
          placeholder="법인명" 
          onChangeText={(t) => setFormData({...formData, corporate_name: t})} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="이름" 
          onChangeText={(t) => setFormData({...formData, name: t})} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="부서명 (예: 생산관리팀)" 
          onChangeText={(t) => setFormData({...formData, dept_name: t})} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="이메일" 
          autoCapitalize="none" 
          onChangeText={(t) => setFormData({...formData, email: t})} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="비밀번호" 
          secureTextEntry 
          onChangeText={(t) => setFormData({...formData, password: t})} 
        />
        
        <TouchableOpacity style={styles.button} onPress={handleSignUp}>
          <Text style={styles.buttonText}>가입하기</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingTop: Platform.OS === 'ios' ? 60 : 40, 
    padding: 15, 
    borderBottomWidth: 1, 
    borderColor: '#eee' 
  },
  headerText: { fontSize: 18, fontWeight: '600', marginLeft: 10 },
  container: { padding: 30 },
  input: { borderBottomWidth: 1, borderColor: '#ccc', marginBottom: 25, padding: 10, fontSize: 16 },
  button: { backgroundColor: '#007AFF', padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});