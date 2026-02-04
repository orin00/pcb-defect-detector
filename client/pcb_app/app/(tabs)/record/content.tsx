import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../../../constants/Config';

/** [식별명: 프로젝트 상세 및 상태 관리 화면] */
export default function ProjectContent() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  // [핵심] 현재 상태를 담는 State. params에서 넘어온 초기값을 설정합니다.
  const [currentStatus, setCurrentStatus] = useState<string>(String(params.status || 'PENDING'));

  // 페이지 진입 시 권한 확인 및 자동 REVIEWED 처리
  useEffect(() => {
    const forceReviewUpdate = async () => {
      try {
        let session = Platform.OS !== 'web' 
          ? await SecureStore.getItemAsync('user_session') 
          : localStorage.getItem('user_session');

        if (session) {
          const user = JSON.parse(session);
          setUserRole(user.role);

          const pStatus = String(params.status).toUpperCase();
          
          // 관리자가 PENDING인 프로젝트를 열면 즉시 REVIEWED로 서버 업데이트
          if ((user.role === 'DIRECTOR' || user.role === 'MANAGER') && pStatus === 'PENDING') {
            console.log("자동 상태 업데이트 실행: REVIEWED");
            
            // UI 선반영
            setCurrentStatus('REVIEWED');
            
            await axios.post(`${API_URL}/projects/status/`, {
              project_id: params.id,
              status: 'REVIEWED',
              user_role: user.role // 서버 세션 불일치 대비 강제 권한 전송
            }, { withCredentials: true });
          }
        }
      } catch (e) {
        console.error("자동 업데이트 실패:", e);
      }
    };

    if (params.id) {
      forceReviewUpdate();
    }
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      fetchAnalysisMaterials();
    }, [params.id])
  );

  const fetchAnalysisMaterials = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/analysis-materials/`, {
        params: { project_id: params.id },
        withCredentials: true
      });
      if (response.data.status === 'success') {
        setMaterials(response.data.data);
      }
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // [상태 업데이트 핵심 함수] 승인/거절 버튼 클릭 시 실행
  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const response = await axios.post(`${API_URL}/projects/status/`, {
        project_id: params.id,
        status: newStatus,
        user_role: userRole
      }, { withCredentials: true });

      if (response.data.status === 'success') {
        // 1. 현재 화면의 상태값 즉시 변경 (Re-rendering 유도)
        setCurrentStatus(newStatus);
        
        Alert.alert("성공", `프로젝트 상태가 ${newStatus}로 업데이트되었습니다.`);
      }
    } catch (error: any) {
      console.error("상태 변경 실패:", error.response?.data || error.message);
      Alert.alert("실패", "상태를 변경할 권한이 없거나 서버 오류가 발생했습니다.");
    }
  };

  const handleDownload = async (materialId: number, fileFullUrl: string) => {
    const downloadUrl = `${API_URL}/download-performance/?material_id=${materialId}`;
    try {
      setDownloadingId(materialId);
      const fileNameOnly = fileFullUrl ? fileFullUrl.split('/').pop() : `performance_${materialId}.xlsx`;
      const safeFileName = fileNameOnly || `performance_${materialId}.xlsx`;
      const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      if (!baseDir) throw new Error("경로 확보 실패");
      const localUri = `${baseDir}${safeFileName}`;
      
      const downloadResumable = FileSystem.createDownloadResumable(downloadUrl, localUri, {});
      const result = await downloadResumable.downloadAsync();
      
      if (result && result.uri && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri);
      }
    } catch (error: any) {
      Alert.alert("다운로드 실패", error.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const isAdmin = userRole === 'DIRECTOR' || userRole === 'MANAGER';

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        {/* 뒤로 가기 시 목록이 갱신되도록 replace 대신 push 혹은 단순 back 사용 */}
        <TouchableOpacity onPress={() => router.replace('/(tabs)/record')} style={styles.headerLeft}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{params.model_name || '상세 내역'}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>상태</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {/* 실시간으로 변경된 currentStatus가 반영됨 */}
              <Text style={[styles.value, styles.valueBold, { color: getStatusColor(currentStatus) }]}>
                {currentStatus}
              </Text>
              
              {isAdmin && (currentStatus === 'PENDING' || currentStatus === 'REVIEWED') && (
                <View style={styles.adminActionContainer}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.acceptBtn]} 
                    onPress={() => handleStatusUpdate('ACCEPTED')}
                  >
                    <Text style={styles.actionBtnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn]} 
                    onPress={() => handleStatusUpdate('REJECTED')}
                  >
                    <Text style={styles.actionBtnText}>거절</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>생성일</Text>
            <Text style={styles.value}>{params.created_at ? new Date(params.created_at as string).toLocaleDateString() : '-'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>분석 결과 목록 ({materials.length})</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        ) : materials.length > 0 ? (
          materials.map((item) => (
            <View key={item.id} style={styles.materialCard}>
              <View style={styles.materialHeader}>
                <Text style={styles.materialId}># {item.id}</Text>
                <Text style={styles.materialDate}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
              <View style={styles.materialImageWrapper}>
                <Image source={{ uri: item.defect_image_url }} style={styles.materialImage} resizeMode="contain" />
              </View>
              <View style={styles.materialBody}>
                <Text style={styles.descriptionText}>{item.description || '설명 없음'}</Text>
                <TouchableOpacity 
                  style={[styles.downloadButton, downloadingId === item.id && styles.disabledButton]}
                  onPress={() => handleDownload(item.id, item.performance_data_url)}
                  disabled={downloadingId !== null}
                >
                  {downloadingId === item.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="document-text-outline" size={20} color="#fff" />
                      <Text style={styles.downloadButtonText}>엑셀 다운로드</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>결과가 없습니다.</Text>
        )}
      </ScrollView>
    </View>
  );
}

const getStatusColor = (status: string) => {
  switch(status) {
    case 'ACCEPTED': return '#28a745';
    case 'REJECTED': return '#dc3545';
    case 'REVIEWED': return '#007AFF';
    default: return '#666';
  }
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingTop: 50, paddingBottom: 15, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerLeft: { width: 40 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  container: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, alignItems: 'center' },
  label: { color: '#666' },
  value: { color: '#333' },
  valueBold: { fontWeight: 'bold' },
  adminActionContainer: { flexDirection: 'row', marginLeft: 10, gap: 5 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 },
  acceptBtn: { backgroundColor: '#28a745' },
  rejectBtn: { backgroundColor: '#dc3545' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  materialCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  materialHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 10, backgroundColor: '#f1f3f5' },
  materialId: { fontWeight: 'bold', color: '#007AFF' },
  materialDate: { fontSize: 11, color: '#888' },
  materialImageWrapper: { width: '100%', height: 220, backgroundColor: '#f0f0f0' },
  materialImage: { width: '100%', height: '100%' },
  materialBody: { padding: 15 },
  descriptionText: { fontSize: 14, color: '#444', marginBottom: 15 },
  downloadButton: { flexDirection: 'row', backgroundColor: '#28a745', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  downloadButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  disabledButton: { backgroundColor: '#ccc' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' }
});