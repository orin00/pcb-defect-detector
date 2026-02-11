import { Alert, Platform } from 'react-native';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

export const AppUsabilityQA = {
    
  // 네트워크 통신 테스트
  // 에러원인이 server\pcb_backend\urls.py에서 /api/ 루트에는 연결된 뷰가 없어서 그런거 였어요!!
  testNetworkStability: async () => {
    console.log("QA 네트워크 통신 테스트 시작");
    
    // BASE_URL(/api) 뒤에 실제 존재하는 /detect/ 경로를 붙여 404를 방지
    const targetUrl = `${BASE_URL}/detect/`.replace(/([^:]\/)\/+/g, "$1");
    console.log("시도 중인 URL:", targetUrl);
    
    try {
      await axios.options(targetUrl, { timeout: 5000 });
      console.log("네트워크 상태 정상: 서버 연결 확인 완료");
      Alert.alert("테스트 결과", "네트워크 통신이 정상입니다.");
    } catch (error: any) {
      // 조사해보니까 405 에러가 났어도 서버랑 물리적 통신은 성공한 거라고 합니다.
      if (error.response) {
        console.log("네트워크 통신 성공");
        Alert.alert("테스트 결과", "서버 연결 확인 완료");
      } else {
        console.log("네트워크 에러:", error.message);
        Alert.alert(
          "네트워크 연결 오류",
          "서버와의 연결이 원활하지 않습니다. ngrok 상태를 확인하세요.",
          [{ text: "확인" }]
        );
      }
    }
  },

  
  // 2. 이미지 처리 QA
  testImageProcessing: async () => {
    console.log("QA 이미지 처리 및 메모리 테스트 시작");
    
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('권한 오류', '갤러리 접근 권한이 거부되었습니다.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1, 
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      console.log(`이미지 로드 성공: ${asset.width}x${asset.height}`);
      
      const formData = new FormData();
      const fileData: any = {
        uri: asset.uri,
        name: asset.fileName || 'qa_test_image.jpg',
        type: asset.mimeType || 'image/jpeg',
      };

      formData.append('image', fileData);

      try {
        const response = await axios.post(`${BASE_URL}/detect/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        if (response.data) {
          console.log("서버로부터 분석 응답 수신 성공");
          Alert.alert("QA 완료", "이미지 전송 및 분석 결과 수신에 성공했습니다.");
        }
      } catch (error: any) {
        console.log("이미지 처리 실패:", error.message);
        Alert.alert("업로드 실패", "이미지 처리 중 오류가 발생했습니다.");
      }
    }
  },

  //  자동 로그인 테스트 - 세션을 강제 삭제하여 앱 진입 시 login 화면으로 튕기는지 확인합니다.
  testSessionRedirect: async () => {
    console.log("QA세션 만료 및 리다이렉트 테스트 시작");
    
    try {
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync('user_session');
        await SecureStore.deleteItemAsync('auto_login');
      } else {
        localStorage.removeItem('user_session');
        localStorage.removeItem('auto_login');
      }
      
      console.log("로컬 세션 데이터 삭제 완료");

      Alert.alert(
        "세션 만료 시뮬레이션",
        "세션이 삭제되었습니다. 확인을 누르면 로그인 화면으로 리다이렉트합니다.",
        [{ text: "확인", onPress: () => router.replace('/login') }]
      );
    } catch (error: any) {
      console.log("세션 삭제 실패:", error.message);
    }
  }
};