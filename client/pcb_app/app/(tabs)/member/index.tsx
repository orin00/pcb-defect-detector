import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator,
  RefreshControl,
  ViewStyle,
  TextStyle
} from 'react-native';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { API_URL } from '../../../constants/Config';
import { Ionicons } from '@expo/vector-icons';

interface Member {
  id: number;
  email: string;
  name: string;
  role: 'DIRECTOR' | 'MANAGER' | 'STAFF';
  dept_name: string;
  corporate_name?: string;
}

export default function MemberListScreen() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/company/members/`, {
        withCredentials: true,
      });
      setMembers(response.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        Alert.alert("권한 없음", "DIRECTOR 권한이 필요합니다.");
      } else {
        Alert.alert("오류", "멤버 목록을 불러오지 못했습니다.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const renderItem = ({ item }: { item: Member }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>
          {item.name} <Text style={styles.deptText}>({item.dept_name || '부서없음'})</Text>
        </Text>
        <Text style={styles.memberEmail}>{item.email}</Text>
      </View>
      
      <TouchableOpacity 
        style={styles.editButton}
        onPress={() => {
          // [수정] 타입 에러 방지를 위해 'as any'를 사용하거나 정확한 경로 형식을 맞춤
          router.push({
            pathname: "/member/edit" as any, 
            params: { 
              id: item.id,
              name: item.name,
              dept_name: item.dept_name,
              role: item.role,
              corporate_name: item.corporate_name || 'Tesla PCB'
            }
          });
        }}
      >
        <Text style={styles.editButtonText}>권한 변경</Text>
        <Ionicons name="settings-outline" size={14} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return <ActivityIndicator style={{ flex: 1 }} size="large" color="#007AFF" />;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>부서 멤버 관리</Text>
      <FlatList
        data={members}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchMembers();
          }} />
        }
        ListEmptyComponent={<Text style={styles.emptyText}>해당 부서에 소속된 멤버가 없습니다.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 20, paddingTop: 60 } as ViewStyle,
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' } as TextStyle,
  memberCard: { 
    backgroundColor: '#fff', 
    padding: 15, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3
  } as ViewStyle,
  memberInfo: { flex: 1 } as ViewStyle,
  memberName: { fontSize: 16, fontWeight: '600', color: '#222' } as TextStyle,
  deptText: { fontSize: 13, fontWeight: 'normal', color: '#666' } as TextStyle,
  memberEmail: { fontSize: 14, color: '#888', marginTop: 2 } as TextStyle,
  editButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#EBF5FF', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 8,
    gap: 4
  } as ViewStyle,
  editButtonText: { color: '#007AFF', fontSize: 13, fontWeight: 'bold' } as TextStyle,
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' } as TextStyle
});