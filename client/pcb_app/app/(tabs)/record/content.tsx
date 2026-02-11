import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, Platform, KeyboardAvoidingView } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../../../constants/Config';

// 댓글 및 대댓글 컴포넌트
const CommentArea = ({ materialId, currentUser }: { materialId: number, currentUser: any }) => {
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<{id: number, name: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  const fetchComments = async () => {
    try {
      setFetching(true);
      const res = await axios.get(`${API_URL}/comments/?material_id=${materialId}`);
      setComments(res.data);
    } catch (e) {
      console.error("댓글 로드 실패:", e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [materialId]);

  // 댓글 삭제 함수
  const handleDeleteComment = (commentId: number) => {
    if (!currentUser) return;

    Alert.alert(
      "댓글 삭제",
      "정말로 이 댓글을 삭제하시겠습니까?",
      [
        { text: "취소", style: "cancel" },
        { 
          text: "삭제", 
          style: "destructive", 
          onPress: async () => {
            try {
              const res = await axios.delete(`${API_URL}/comments/`, {
                data: { 
                  comment_id: commentId,
                  user_id: currentUser.id 
                }
              });
              if (res.data.status === 'success') {
                fetchComments();
              } else {
                Alert.alert("알림", res.data.message || "삭제 권한이 없습니다.");
              }
            } catch (e) {
              Alert.alert("삭제 실패", "댓글을 삭제하는 중 오류가 발생했습니다.");
            }
          } 
        }
      ]
    );
  };

  const handleSubmit = async () => {
    if (!text.trim()) return;
    if (!currentUser) {
      Alert.alert("알림", "로그인 후 이용 가능합니다.");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/comments/`, {
        material: materialId,
        author: currentUser.id,
        content: text,
        parent: replyTo?.id || null 
      });
      setText('');
      setReplyTo(null);
      fetchComments();
    } catch (e) {
      Alert.alert("실패", "댓글 저장 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.commentSectionContainer}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
        <Text style={styles.commentCountText}>댓글 {comments.length}개</Text>
        {fetching && <ActivityIndicator size="small" color="#999" style={{ marginLeft: 10 }} />}
      </View>
      
      {comments.map((comment) => (
        <View key={comment.id} style={styles.commentWrapper}>
          <View style={styles.commentMain}>
            <View style={styles.commentTextBubble}>
              <Text style={styles.commentAuthorName}>{comment.author_name}</Text>
              <Text style={styles.commentContentText}>{comment.content}</Text>
            </View>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setReplyTo({ id: comment.id, name: comment.author_name })} style={styles.replyButton}>
                <Text style={styles.replyButtonText}>답글 달기</Text>
              </TouchableOpacity>

              {/* 사용자가 작성한 댓글이면 삭제 버튼 표시되게 */}
              {currentUser?.id === comment.author && (
                <TouchableOpacity onPress={() => handleDeleteComment(comment.id)} style={[styles.replyButton, { marginLeft: 15 }]}>
                  <Text style={[styles.replyButtonText, { color: '#dc3545' }]}>삭제</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* 대댓글 영역ㄱ */}
          {comment.replies && comment.replies.map((reply: any) => (
            <View key={reply.id} style={styles.replyItem}>
              <Ionicons name="return-down-forward" size={16} color="#ccc" style={{ marginRight: 5 }} />
              <View style={{ flex: 1 }}>
                <View style={styles.commentTextBubble}>
                  <Text style={styles.commentAuthorName}>{reply.author_name}</Text>
                  <Text style={styles.commentContentText}>{reply.content}</Text>
                </View>
                
                {currentUser?.id === reply.author && (
                  <TouchableOpacity onPress={() => handleDeleteComment(reply.id)} style={styles.replyButton}>
                    <Text style={[styles.replyButtonText, { color: '#dc3545' }]}>삭제</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
        </View>
      ))}
      
      {/* 입력창 */}
      <View style={styles.inputWrapper}>
        {replyTo && (
          <View style={styles.replyTargetIndicator}>
            <Text style={styles.replyTargetText}>@{replyTo.name} 님께 답글 남기는 중...</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close-circle" size={18} color="#666" />
            </TouchableOpacity>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput 
            style={styles.input} 
            value={text} 
            onChangeText={setText} 
            placeholder={replyTo ? "답글을 입력하세요..." : "댓글을 입력하세요..."}
            multiline
            placeholderTextColor="#999"
          />
          <TouchableOpacity 
            style={[styles.sendBtn, (!text.trim() || loading) && styles.sendBtnDisabled]} 
            onPress={handleSubmit}
            disabled={!text.trim() || loading}
          >
            {loading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function ProjectContent() {
  const params = useLocalSearchParams();
  const router = useRouter();

  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentStatus, setCurrentStatus] = useState<string>(String(params.status || 'PENDING'));

  useEffect(() => {
    const initPage = async () => {
      try {
        let session = Platform.OS !== 'web' 
          ? await SecureStore.getItemAsync('user_session') 
          : localStorage.getItem('user_session');

        if (session) {
          const user = JSON.parse(session);
          setCurrentUser(user);
          setUserRole(user.role);

          const pStatus = String(params.status).toUpperCase();
          if ((user.role === 'DIRECTOR' || user.role === 'MANAGER') && pStatus === 'PENDING') {
            setCurrentStatus('REVIEWED');
            await axios.post(`${API_URL}/projects/status/`, {
              project_id: params.id,
              status: 'REVIEWED',
              user_role: user.role
            }, { withCredentials: true });
          }
        }
      } catch (e) {
        console.error("초기화 실패:", e);
      }
    };

    if (params.id) initPage();
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

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const response = await axios.post(`${API_URL}/projects/status/`, {
        project_id: params.id,
        status: newStatus,
        user_role: userRole
      }, { withCredentials: true });

      if (response.data.status === 'success') {
        setCurrentStatus(newStatus);
        Alert.alert("성공", `프로젝트 상태가 ${newStatus}로 업데이트되었습니다.`);
      }
    } catch (error: any) {
      Alert.alert("실패", "상태 변경 권한이 없거나 서버 오류입니다.");
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
    <KeyboardAvoidingView 
      style={styles.mainContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/record')} style={styles.headerLeft}>
          <Ionicons name="chevron-back" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{params.model_name || '상세 내역'}</Text>
        </View>
        <View style={styles.headerRight} />
      </View>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.label}>상태</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.value, styles.valueBold, { color: getStatusColor(currentStatus) }]}>
                {currentStatus}
              </Text>
              {isAdmin && (currentStatus === 'PENDING' || currentStatus === 'REVIEWED') && (
                <View style={styles.adminActionContainer}>
                  <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]} onPress={() => handleStatusUpdate('ACCEPTED')}>
                    <Text style={styles.actionBtnText}>승인</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleStatusUpdate('REJECTED')}>
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

        <Text style={styles.sectionTitle}>분석 결과 및 의견 ({materials.length})</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        ) : materials.length > 0 ? (
          materials.map((item) => (
            <View key={item.id} style={styles.materialCard}>
              <View style={styles.materialHeader}>
                <Text style={styles.materialId}>No. {item.id}</Text>
                <Text style={styles.materialDate}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
              
              <View style={styles.materialImageWrapper}>
                <Image source={{ uri: item.defect_image_url }} style={styles.materialImage} resizeMode="contain" />
              </View>
              
              <View style={styles.materialBody}>
                <Text style={styles.descriptionText}>{item.description || '결함 설명이 작성되지 않았습니다.'}</Text>
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
                      <Text style={styles.downloadButtonText}>회로 입출력 검사 결과(Excel) 다운로드</Text>
                    </>
                  )}
                </TouchableOpacity>

                <CommentArea materialId={item.id} currentUser={currentUser} />
              </View>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>등록된 분석 결과가 없습니다.</Text>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  container: { padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, alignItems: 'center' },
  label: { color: '#666', fontSize: 14 },
  value: { color: '#333', fontSize: 14 },
  valueBold: { fontWeight: 'bold' },
  adminActionContainer: { flexDirection: 'row', marginLeft: 10, gap: 5 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  acceptBtn: { backgroundColor: '#28a745' },
  rejectBtn: { backgroundColor: '#dc3545' },
  actionBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  materialCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 25, overflow: 'hidden', borderWidth: 1, borderColor: '#eee' },
  materialHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#f1f3f5' },
  materialId: { fontWeight: 'bold', color: '#007AFF' },
  materialDate: { fontSize: 11, color: '#888' },
  materialImageWrapper: { width: '100%', height: 220, backgroundColor: '#000' },
  materialImage: { width: '100%', height: '100%' },
  materialBody: { padding: 15 },
  descriptionText: { fontSize: 15, color: '#444', marginBottom: 15, lineHeight: 20 },
  downloadButton: { flexDirection: 'row', backgroundColor: '#495057', padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  downloadButtonText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  disabledButton: { backgroundColor: '#ccc' },
  emptyText: { textAlign: 'center', marginTop: 50, color: '#999' },
  commentSectionContainer: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  commentCountText: { fontSize: 13, fontWeight: 'bold', color: '#666' },
  commentWrapper: { marginBottom: 15 },
  commentMain: { marginBottom: 5 },
  commentTextBubble: { backgroundColor: '#f0f2f5', padding: 10, borderRadius: 12, alignSelf: 'flex-start', maxWidth: '90%' },
  commentAuthorName: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 2 },
  commentContentText: { fontSize: 14, color: '#444' },
  replyButton: { marginTop: 4, marginLeft: 5 },
  replyButtonText: { fontSize: 12, color: '#007AFF', fontWeight: '600' },
  replyItem: { flexDirection: 'row', marginLeft: 25, marginTop: 8, alignItems: 'flex-start' },
  inputWrapper: { marginTop: 10, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#ddd', padding: 5 },
  replyTargetIndicator: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 5, backgroundColor: '#f8f9fa', borderRadius: 5, marginBottom: 5 },
  replyTargetText: { fontSize: 12, color: '#007AFF' },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end' },
  input: { flex: 1, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, maxHeight: 80, color: '#333' },
  sendBtn: { backgroundColor: '#007AFF', width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginLeft: 5, marginBottom: 2 },
  sendBtnDisabled: { backgroundColor: '#bcd0f7' }
});