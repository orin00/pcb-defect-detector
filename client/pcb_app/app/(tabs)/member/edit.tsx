import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ViewStyle, TextStyle } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker'; 
import axios from 'axios';
import { API_URL } from '../../../constants/Config';
import { Ionicons } from '@expo/vector-icons';

// 멤버 권한 수정
export default function MemberEditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // 넘겨받은 파라미터가 없거나 잘못되었을 경우 기본값 처리
  const corporateName = params.corporate_name || "소속 정보 없음";
  const deptName = params.dept_name || "부서 미지정";
  const userName = params.name || "이름 없음";

  const [selectedRole, setSelectedRole] = useState(params.role as string || 'STAFF');

  const handleUpdateRole = async () => {
    try {
      const response = await axios.post(`${API_URL}/company/members/`, {
        target_user_id: params.id,
        new_role: selectedRole
      }, { withCredentials: true });

      if (response.status === 200) {
        Alert.alert("성공", "권한이 성공적으로 변경되었습니다.", [
          { text: "확인", onPress: () => router.back() }
        ]);
      }
    } catch (error) {
      console.error("Update Error:", error);
      Alert.alert("오류", "권한 변경에 실패했습니다.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>권한 수정</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.infoRow}>
          <Text style={styles.label}>소속 법인</Text>
          <Text style={styles.value}>{corporateName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>부서명</Text>
          <Text style={styles.value}>{deptName}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>이름</Text>
          <Text style={styles.value}>{userName}</Text>
        </View>

        <Text style={[styles.label, { marginTop: 20 }]}>역할 설정</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedRole}
            onValueChange={(itemValue) => setSelectedRole(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="DIRECTOR (관리자)" value="DIRECTOR" />
            <Picker.Item label="MANAGER (운영자)" value="MANAGER" />
            <Picker.Item label="STAFF (실무자)" value="STAFF" />
          </Picker>
        </View>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleUpdateRole}>
        <Text style={styles.submitButtonText}>변경 사항 저장</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20, paddingTop: 60 } as ViewStyle,
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30, gap: 10 } as ViewStyle,
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' } as TextStyle,
  card: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10
  } as ViewStyle,
  infoRow: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10 } as ViewStyle,
  label: { fontSize: 14, color: '#888', marginBottom: 4 } as TextStyle,
  value: { fontSize: 16, color: '#333', fontWeight: '500' } as TextStyle,
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    marginTop: 10,
    backgroundColor: '#fdfdfd'
  } as ViewStyle,
  picker: { height: 50, width: '100%' },
  submitButton: { 
    backgroundColor: '#007AFF', 
    borderRadius: 12, 
    height: 55, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginTop: 30 
  } as ViewStyle,
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' } as TextStyle
});