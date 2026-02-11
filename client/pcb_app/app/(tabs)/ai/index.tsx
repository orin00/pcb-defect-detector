import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useFocusEffect } from 'expo-router';
import axios from 'axios';
import { useRouter } from 'expo-router';
import { API_URL } from '../../../constants/Config';
import { Ionicons } from '@expo/vector-icons';

export default function AIScreen() {
  const router = useRouter();
  const [image, setImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisData, setAnalysisData] = useState<any[]>([]);

  useFocusEffect(
    useCallback(() => {
      setImage(null);
      setResultImage(null);
      setAnalysisData([]);
      setLoading(false);
    }, [])
  );

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setResultImage(null);
      setAnalysisData([]);
    }
  };

  const handleDetect = async () => {
    if (!image || loading) return;
    setLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('image', { uri: image, name: 'detect.jpg', type: 'image/jpeg' });

    try {
      const response = await axios.post(`${API_URL}/detect/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.status === 'success') {
        setResultImage(response.data.result_image);
        setAnalysisData(response.data.detections);
      }
    } catch (error) {
      Alert.alert("탐지 에러", "서버 분석 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const goToUploadPage = () => {
    if (!resultImage) {
      Alert.alert("알림", "탐지를 먼저 완료해주세요.");
      return;
    }

    router.push({
      pathname: '/(tabs)/ai/upload',
      params: { 
        resultImage: resultImage, 
        projectId: 1
      }
    });
  };

  
  return (
    <View style={styles.mainContainer}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}><Text style={styles.headerTitle}>PCB AI 분석 시스템</Text></View>

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.imageWrapper}>
          {resultImage ? (
            <Image source={{ uri: resultImage }} style={styles.preview} resizeMode="contain" />
          ) : image ? (
            <Image source={{ uri: image }} style={styles.preview} resizeMode="contain" />
          ) : (
            <View style={styles.emptyPreview}><Ionicons name="images" size={50} color="#ccc" /></View>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.pickButton} onPress={pickImage}>
            <Text style={styles.buttonText}>사진 선택</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.detectButton, (!image || loading) && styles.disabledButton]} 
            onPress={handleDetect}
            disabled={!image || loading}
          >
            <Text style={styles.buttonText}>탐지 시작</Text>
          </TouchableOpacity>
        </View>

      <TouchableOpacity 
        style={[styles.uploadButton, (!resultImage || loading) && styles.disabledButton]} 
        onPress={goToUploadPage}
        disabled={!resultImage || loading}
      >
        <Ionicons name="create-outline" size={20} color="#fff" style={{marginRight: 8}} />
        <Text style={styles.buttonText}>분석 결과 기입 및 업로드</Text>
      </TouchableOpacity>

        {loading && <ActivityIndicator size="large" color="#007AFF" style={{marginTop: 20}} />}

        {analysisData.length > 0 && (
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>분석 결과 ({analysisData.length}개 탐지)</Text>
            {analysisData.map((item, index) => (
              <View key={index} style={styles.defectCard}>
                <Text style={styles.defectName}>{item.display_id}. {item.name}</Text>
                <Text style={styles.defectConf}>{(item.confidence * 100).toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#fff' },
  header: { paddingTop: 60, paddingBottom: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  container: { padding: 20 },
  imageWrapper: { width: '100%', height: 350, backgroundColor: '#f9f9f9', borderRadius: 15, marginBottom: 20, borderWidth: 1, borderColor: '#eee', overflow: 'hidden' },
  preview: { width: '100%', height: '100%' },
  emptyPreview: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  pickButton: { flex: 1, backgroundColor: '#444', padding: 15, borderRadius: 10, alignItems: 'center' },
  detectButton: { flex: 1, backgroundColor: '#007AFF', padding: 15, borderRadius: 10, alignItems: 'center' },
  uploadButton: { width: '100%', backgroundColor: '#28a745', padding: 18, borderRadius: 10, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  disabledButton: { backgroundColor: '#ccc' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  resultSection: { marginTop: 10 },
  resultTitle: { fontSize: 17, fontWeight: 'bold', marginBottom: 10, color: '#d9534f' },
  defectCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, backgroundColor: '#fcfcfc', borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#eee' },
  defectName: { fontWeight: 'bold' },
  defectConf: { color: '#666' }
});