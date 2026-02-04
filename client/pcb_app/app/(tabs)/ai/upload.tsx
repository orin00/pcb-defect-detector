import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image, 
  Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, 
  Platform, TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
// [수정 핵심] SDK 54 대응을 위해 legacy API를 사용하여 readAsStringAsync 에러를 해결합니다.
import * as FileSystem from 'expo-file-system/legacy'; 
import { API_URL } from '../../../constants/Config';
import { Ionicons } from '@expo/vector-icons';

export default function AnalysisUploadScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { resultImage } = params; 

  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<{id: number, name: string} | null>(null);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [excelFile, setExcelFile] = useState<{uri: string, name: string, size?: number} | null>(null);

  useFocusEffect(
    useCallback(() => {
      setDescription('');
      setSelectedProject(null);
      setIsPickerOpen(false);
      setExcelFile(null);
      setLoading(false);
      fetchProjects();
    }, [])
  );

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API_URL}/projects/`, { withCredentials: true });
      if (response.data.status === 'success') {
        setProjects(response.data.data);
      }
    } catch (error) {
      console.error("프로젝트 로드 실패:", error);
    }
  };

  const pickExcelFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
          'application/vnd.ms-excel', 
          'text/csv', 
        ],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        setExcelFile({
          uri: file.uri,
          name: file.name,
          size: file.size
        });
      }
    } catch (err) {
      Alert.alert("오류", "파일 선택 중 문제가 발생했습니다.");
    }
  };

  const handleUpload = async () => {
    if (!selectedProject || !resultImage || !excelFile) {
      Alert.alert('알림', '프로젝트, 이미지, 엑셀 파일을 모두 확인해주세요.');
      return;
    }

    try {
      setLoading(true);
      
      // [영구 규정 준수] EncodingType 대신 무조건 문자열 'base64' 사용
      const excelBase64 = await FileSystem.readAsStringAsync(excelFile.uri, { 
        encoding: 'base64' 
      });

      const payload = {
        project_id: selectedProject.id,
        image_data: resultImage,
        excel_data: excelBase64,
        excel_name: excelFile.name,
        description: description,
      };

      const response = await axios.post(`${API_URL}/upload-result/`, payload, {
        withCredentials: true,
      });

      if (response.data.status === 'success') {
        Alert.alert('성공', '분석 결과가 저장되었습니다.', [
          { 
            text: '확인', 
            // [규정 준수] 기록 목록 화면으로 이동
            onPress: () => router.replace('/record' as any) 
          }
        ]);
      }
    } catch (error: any) {
      console.error("업로드 에러 상세:", error);
      Alert.alert('업로드 에러', error.message || '문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>최종 결과 등록</Text>

          <Text style={styles.sectionLabel}>1. 대상 프로젝트</Text>
          <TouchableOpacity 
            style={[styles.pickerTrigger, isPickerOpen && styles.pickerTriggerActive]} 
            onPress={() => setIsPickerOpen(!isPickerOpen)}
          >
            <Text style={styles.pickerText}>{selectedProject ? selectedProject.name : '프로젝트를 선택하세요'}</Text>
            <Ionicons name={isPickerOpen ? "chevron-up" : "chevron-down"} size={20} color="#666" />
          </TouchableOpacity>

          {isPickerOpen && (
            <View style={styles.optionsContainer}>
              {projects.map((p) => (
                <TouchableOpacity key={p.id} style={styles.optionItem} onPress={() => {
                  setSelectedProject({ id: p.id, name: p.model_name });
                  setIsPickerOpen(false);
                }}>
                  <Text style={styles.optionText}>{p.model_name} (ID: {p.id})</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.sectionLabel}>2. 성능 데이터 (XLSX, XLS, CSV)</Text>
          <View style={styles.excelSection}>
            <TouchableOpacity 
              style={[styles.excelButton, excelFile ? styles.excelButtonSelected : null]} 
              onPress={pickExcelFile}
            >
              <Ionicons name="document-text-outline" size={24} color={excelFile ? "#fff" : "#28a745"} />
              <Text style={[styles.excelButtonText, excelFile ? {color: '#fff'} : null]}>
                {excelFile ? "파일 교체하기" : "데이터 파일 불러오기"}
              </Text>
            </TouchableOpacity>

            {excelFile ? (
              <View style={styles.fileDisplayBox}>
                <Ionicons name="checkmark-circle" size={20} color="#28a745" />
                <Text style={styles.fileNameText} numberOfLines={1}>{excelFile.name}</Text>
                <TouchableOpacity onPress={() => setExcelFile(null)}>
                  <Ionicons name="close-circle" size={20} color="#ff4d4d" />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.noFileText}>선택된 파일이 없습니다.</Text>
            )}
          </View>

          <Text style={styles.sectionLabel}>3. 분석 이미지 확인</Text>
          <View style={styles.imageWrapper}>
            <Image 
              source={{ uri: resultImage as string }} 
              style={styles.resultPreview} 
              resizeMode="contain" 
            />
          </View>

          <Text style={styles.sectionLabel}>4. 특이사항</Text>
          <TextInput
            style={styles.textArea}
            multiline
            placeholder="내용을 입력하세요."
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity style={styles.submitButton} onPress={handleUpload} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitButtonText}>최종 저장</Text>}
          </TouchableOpacity>
          <View style={{ height: 50 }} />
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f8f9fa' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  sectionLabel: { fontSize: 16, fontWeight: 'bold', color: '#444', marginBottom: 10, marginTop: 15 },
  pickerTrigger: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderWidth: 1, borderColor: '#ced4da', borderRadius: 12, backgroundColor: '#fff' },
  pickerTriggerActive: { borderColor: '#007AFF', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  pickerText: { fontSize: 16 },
  // [복구] 기존 스크롤 기능을 유지하기 위해 maxHeight 설정을 하지 않습니다.
  optionsContainer: { borderWidth: 1, borderTopWidth: 0, borderColor: '#ced4da', borderBottomLeftRadius: 12, borderBottomRightRadius: 12, backgroundColor: '#fff' },
  optionItem: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f3f5' },
  optionText: { fontSize: 15 },
  excelSection: { backgroundColor: '#fff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
  excelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#28a745', borderStyle: 'dashed' },
  excelButtonSelected: { backgroundColor: '#28a745', borderStyle: 'solid' },
  excelButtonText: { marginLeft: 8, fontSize: 15, fontWeight: 'bold', color: '#28a745' },
  fileDisplayBox: { flexDirection: 'row', alignItems: 'center', marginTop: 12, padding: 10, backgroundColor: '#f0fff4', borderRadius: 8 },
  fileNameText: { flex: 1, marginLeft: 8, fontSize: 14 },
  noFileText: { marginTop: 10, textAlign: 'center', color: '#a0aec0' },
  imageWrapper: { width: '100%', height: 230, backgroundColor: '#000', borderRadius: 12, overflow: 'hidden' },
  resultPreview: { width: '100%', height: '100%' },
  textArea: { width: '100%', height: 100, backgroundColor: '#fff', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#ced4da', textAlignVertical: 'top' },
  submitButton: { backgroundColor: '#007AFF', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  submitButtonText: { color: '#fff', fontSize: 17, fontWeight: 'bold' }
});