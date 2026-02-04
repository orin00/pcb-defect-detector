import os
# OpenMP 중복 로드 에러 해결을 위한 설정
os.environ['KMP_DUPLICATE_LIB_OK'] = 'True'

import torch
import cv2
import xml.etree.ElementTree as ET
from tqdm import tqdm

# 1. 경로 설정
BASE_DIR = r"D:\final_project\VOC_PCB"
XML_DIR = os.path.join(BASE_DIR, "Annotations")
WEIGHTS_PATH = r"D:\final_project\yolov5\runs\train\pcb_final_run\weights\best.pt"
TEST_LIST_PATH = os.path.join(BASE_DIR, "test.txt")
SAVE_DIR = r"D:\final_project\yolov5\runs\detect\test_results"

if not os.path.exists(SAVE_DIR):
    os.makedirs(SAVE_DIR)

# 2. 모델 로드
model = torch.hub.load('.', 'custom', path=WEIGHTS_PATH, source='local')
model.conf = 0.4 
model.iou = 0.45

# 3. XML에서 정답(Ground Truth) 정보 추출 함수
def get_gt_boxes(xml_path):
    tree = ET.parse(xml_path)
    root = tree.getroot()
    boxes = []
    for obj in root.findall('object'):
        name = obj.find('name').text
        bndbox = obj.find('bndbox')
        xmin = int(bndbox.find('xmin').text)
        ymin = int(bndbox.find('ymin').text)
        xmax = int(bndbox.find('xmax').text)
        ymax = int(bndbox.find('ymax').text)
        boxes.append({'name': name, 'bbox': [xmin, ymin, xmax, ymax]})
    return boxes

# 4. IOU 계산 함수 (두 박스가 얼마나 겹치는지 계산)
def calculate_iou(box1, box2):
    x1 = max(box1[0], box2[0])
    y1 = max(box1[1], box2[1])
    x2 = min(box1[2], box2[2])
    y2 = min(box1[3], box2[3])
    
    intersection = max(0, x2 - x1) * max(0, y2 - y1)
    area1 = (box1[2] - box1[0]) * (box1[3] - box1[1])
    area2 = (box2[2] - box2[0]) * (box2[3] - box2[1])
    union = area1 + area2 - intersection
    
    return intersection / union if union > 0 else 0

# 5. 테스트 수행 및 평가
with open(TEST_LIST_PATH, 'r') as f:
    test_image_paths = [line.strip() for line in f.readlines() if line.strip()]

total_gt_count = 0      # 실제 결함 수
total_tp_count = 0      # 맞게 찾은 결함 수 (True Positive)
total_fp_count = 0      # 잘못 찾은 결함 수 (False Positive)

print(f"총 {len(test_image_paths)}개의 테스트 이미지 평가 시작...")

for img_path in tqdm(test_image_paths):
    if not os.path.exists(img_path):
        continue
        
    # 모델 추론
    results = model(img_path)
    pred_data = results.pandas().xyxy[0] # 예측 좌표 데이터프레임
    
    # 해당 이미지의 XML 정답 가져오기
    xml_filename = os.path.splitext(os.path.basename(img_path))[0] + ".xml"
    xml_path = os.path.join(XML_DIR, xml_filename)
    
    if not os.path.exists(xml_path):
        continue
        
    gt_boxes = get_gt_boxes(xml_path)
    total_gt_count += len(gt_boxes)
    
    # 예측된 박스들과 실제 박스들 비교 (IOU > 0.5 기준)
    matched_gt = [False] * len(gt_boxes)
    
    for _, pred in pred_data.iterrows():
        p_box = [pred['xmin'], pred['ymin'], pred['xmax'], pred['ymax']]
        best_iou = 0
        best_gt_idx = -1
        
        for i, gt in enumerate(gt_boxes):
            if matched_gt[i]: continue # 이미 매칭된 정답은 제외
            
            # 클래스명이 같을 때만 IOU 계산
            if pred['name'] == gt['name']:
                iou = calculate_iou(p_box, gt['bbox'])
                if iou > best_iou:
                    best_iou = iou
                    best_gt_idx = i
        
        if best_iou >= 0.5: # IOU 0.5 이상이면 정답으로 간주
            total_tp_count += 1
            matched_gt[best_gt_idx] = True
        else:
            total_fp_count += 1
            
    # 결과 이미지 저장
    results.save(save_dir=SAVE_DIR)

# 6. 최종 성적 지표 출력
precision = total_tp_count / (total_tp_count + total_fp_count) if (total_tp_count + total_fp_count) > 0 else 0
recall = total_tp_count / total_gt_count if total_gt_count > 0 else 0

print("\n" + "="*30)
print(f"평가 결과 보고서")
print("-" * 30)
print(f"실제 결함 총수: {total_gt_count}")
print(f"정확히 탐지한 수: {total_tp_count}")
print(f"오탐(잘못 탐지): {total_fp_count}")
print(f"미탐(못 찾음): {total_gt_count - total_tp_count}")
print("-" * 30)
print(f"정밀도(Precision): {precision:.2%}")
print(f"재현율(Recall, 정답률): {recall:.2%}")
print("="*30)