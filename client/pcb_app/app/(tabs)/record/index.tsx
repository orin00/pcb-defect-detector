import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router'; // Stack 추가
import { Ionicons } from '@expo/vector-icons';
import Records from './records';

/** [식별명: 프로젝트 인덱스 화면] */
export default function RecordIndex() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.headerLeft} />

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>프로젝트</Text>
        </View>

        <TouchableOpacity 
          style={styles.headerRight} 
          onPress={() => router.push({
            pathname: '/(tabs)/record/edit',
            params: { from: '/(tabs)/record' } // [수정] 이전 경로 전달
          })}
        >
          <Text style={styles.addButtonText}>신규 등록</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.body}>
        <Records 
          onPressItem={(project) => {
            router.push({
              pathname: '/(tabs)/record/content',
              params: { 
                id: project.id, 
                company_id: project.company_id,
                model_name: project.model_name,
                status: project.status,
                created_at: project.created_at,
                from: '/(tabs)/record' // [수정] 이전 경로 전달
              }
            });
          }} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    paddingHorizontal: 15, 
    paddingTop: 50, 
    paddingBottom: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff'
  },
  headerLeft: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  addButtonText: { 
    color: '#007AFF', 
    fontSize: 15, 
    fontWeight: '600' 
  },
  body: { 
    flex: 1, 
  }
});