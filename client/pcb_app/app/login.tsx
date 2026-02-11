import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_URL } from '../constants/Config';
import * as SecureStore from 'expo-secure-store';

// 로그인 페이지
export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAutoLogin, setIsAutoLogin] = useState(false);

  const handleLogin = async () => {
    try {
      const response = await axios.post(`${API_URL}/login/`, {
        email: email,
        password: password
      });
      
      if (response.data.status === 'success') {
        const userInfoString = JSON.stringify(response.data.user_info);

        if (Platform.OS !== 'web') {
          await SecureStore.setItemAsync('user_session', userInfoString);
          if (isAutoLogin) {
            await SecureStore.setItemAsync('auto_login', 'true');
          } else {
            await SecureStore.setItemAsync('auto_login', 'false');
          }
        } else {
          localStorage.setItem('user_session', userInfoString);
          localStorage.setItem('auto_login', isAutoLogin ? 'true' : 'false');
        }

        router.replace('/(tabs)');
      }
    } catch (error) {
      Alert.alert("로그인 실패", "이메일 또는 비밀번호를 확인해주세요.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>PCB Detector</Text>
      
      <TextInput 
        style={styles.input} 
        placeholder="이메일" 
        value={email} 
        onChangeText={setEmail} 
        autoCapitalize="none"
      />
      <TextInput 
        style={styles.input} 
        placeholder="비밀번호" 
        secureTextEntry 
        value={password} 
        onChangeText={setPassword} 
      />

      <TouchableOpacity 
        style={styles.checkboxArea} 
        onPress={() => setIsAutoLogin(!isAutoLogin)}
      >
        <View style={[styles.checkbox, isAutoLogin && styles.checked]}>
          {isAutoLogin && <Text style={styles.checkMark}>✓</Text>}
        </View>
        <Text style={styles.checkboxLabel}>이 기기에서 자동 로그인 유지</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>로그인</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/signup')} style={styles.signupLink}>
        <Text style={styles.signupText}>계정이 없으신가요? 회원가입</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#fff' },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 50, textAlign: 'center', color: '#007AFF' },
  input: { borderBottomWidth: 1, borderColor: '#ccc', marginBottom: 20, padding: 10, fontSize: 16 },
  checkboxArea: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#007AFF', borderRadius: 4, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  checked: { backgroundColor: '#007AFF' },
  checkMark: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel: { fontSize: 14, color: '#333' },
  button: { backgroundColor: '#007AFF', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  signupLink: { marginTop: 10, alignItems: 'center' },
  signupText: { color: '#007AFF', fontSize: 14, textDecorationLine: 'underline' }
});