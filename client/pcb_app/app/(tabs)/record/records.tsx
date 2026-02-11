import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../../../constants/Config'; 

axios.defaults.withCredentials = true;

interface Project {
  id: number;
  company_id: number;
  model_name: string;
  status: string;
  created_at: string;
}

interface RecordsProps {
  onPressItem?: (project: Project) => void;
}

const Records: React.FC<RecordsProps> = ({ onPressItem }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // 권한 정보 가져오기
  useEffect(() => {
    const loadUserRole = async () => {
      try {
        let session = Platform.OS !== 'web' 
          ? await SecureStore.getItemAsync('user_session') 
          : localStorage.getItem('user_session');

        if (session) {
          const user = JSON.parse(session);
          setUserRole(user.role);
        }
      } catch (e) {
        console.error("권한 로드 실패", e);
      }
    };
    loadUserRole();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProjects();
    }, [])
  );

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/projects/`, {
        withCredentials: true,
      });

      if (response.data.status === 'success') {
        setProjects(response.data.data);
      }
    } catch (error: any) {
      console.error("데이터 조회 에러:", error.response || error);
    } finally {
      setLoading(false);
    }
  };

  const formatKSTDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const handleDelete = (id: number, modelName: string) => {
    Alert.alert(
      "프로젝트 삭제",
      `'${modelName}' 프로젝트를 정말 삭제하시겠습니까?`,
      [
        { text: "취소", style: "cancel" },
        { 
          text: "삭제", 
          style: "destructive", 
          onPress: async () => {
            try {
              const response = await axios.delete(`${API_URL}/projects/`, {
                params: { id: id },
                data: { user_role: userRole },
                withCredentials: true
              });

              if (response.data.status === 'success') {
                Alert.alert("완료", "프로젝트가 삭제되었습니다.");
                fetchProjects(); 
              }
            } catch (error: any) {
              Alert.alert("에러", "삭제 권한이 없거나 서버 오류가 발생했습니다.");
            }
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: Project }) => (
    <View style={styles.cardContainer}>
      <TouchableOpacity 
        style={styles.card} 
        onPress={() => onPressItem && onPressItem(item)}
      >
        <View style={styles.cardContent}>
          <Text style={styles.modelName}>{item.model_name}</Text>
          <Text style={styles.date}>{formatKSTDate(item.created_at)}</Text>
        </View>
        
        <View style={styles.rightContent}>
          <View style={[styles.statusBadge, { backgroundColor: getBadgeColor(item.status) }]}>
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
          
          {(userRole === 'DIRECTOR' || userRole === 'MANAGER') && (
            <TouchableOpacity 
              style={styles.deleteBtn} 
              onPress={() => handleDelete(item.id, item.model_name)}
            >
              <Ionicons name="trash-outline" size={20} color="#dc3545" />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  const getBadgeColor = (status: string) => {
    switch(status) {
      case 'ACCEPTED': return '#e6ffed';
      case 'REJECTED': return '#fff1f0';
      case 'REVIEWED': return '#e6f7ff';
      default: return '#f5f5f5';
    }
  };

  if (loading && projects.length === 0) return <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 50 }} />;

  return (
    <FlatList
      data={projects}
      renderItem={renderItem}
      keyExtractor={(item) => item.id.toString()}
      ListEmptyComponent={<Text style={styles.emptyText}>등록된 프로젝트가 없습니다.</Text>}
      onRefresh={fetchProjects}
      refreshing={loading}
      contentContainerStyle={{ paddingBottom: 20 }}
    />
  );
};

const styles = StyleSheet.create({
  cardContainer: { marginHorizontal: 20, marginVertical: 8 },
  card: { 
    backgroundColor: '#fff', 
    padding: 18, 
    borderRadius: 12, 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 2 
  },
  cardContent: { flex: 1 },
  modelName: { fontSize: 17, fontWeight: 'bold', color: '#1a1a1a' },
  date: { fontSize: 13, color: '#888', marginTop: 4 },
  rightContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  deleteBtn: { padding: 5, marginLeft: 5 },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});

export default Records;