

# 国土房产测绘数据智能归档管理系统 - 功能说明文档

## 1. 系统概述

本系统旨在为国土与房产测绘部门提供一套高效、智能的数据处理与归档解决方案。通过集成智能化识别与人工审核机制，解决传统测绘报告（PDF/纸质）向数字化台账（Excel/数据库）转换过程中的效率低、易出错难题，实现从“文件上传”到“数据入库”的全流程闭环管理。

---

## 2. 核心模块与功能详解

### 2.1. 系统驾驶舱 (Dashboard)

**定位**：全局数据的可视化监控中心，帮助管理者快速掌握作业进度与数据资产状况。

* **核心指标监控**：实时展示当前系统内的项目总数、已归档文件总量、本周新增工作量及待处理的异常数据预警。
* **趋势分析**：通过动态图表直观展示“实测报告”与“合同文件”的归档数量趋势（支持按周、月、年维度切换），辅助决策分析。
* **快捷入口**：提供面板设置与数据刷新功能，作为每日工作的起始站。

### 2.2. 智能作业工作台 (Smart Workbench)

**定位**：核心业务操作区，支持从文件接入到数据清洗的全过程处理。

* **项目化管理**：
    * 支持**新建项目**，录入项目名称、开发商及编号，建立数据归属。
    * 支持**多项目切换**，严格隔离不同项目的文档数据，互不干扰。


* **批量文件接入**：
    * 支持**批量上传**合同文件与实测报告。
    * 提供文件**缩略图预览**，直观区分文件类型。
    * **智能状态流转**：清晰展示文件当前处于“等待解析”、“识别中”、“清洗中”还是“待审核”状态。


* **智能审核/校对模式 (核心亮点)**：
    * **双屏协同视图**：左侧为原件预览（支持 PDF 翻页、缩放），右侧为提取后的数字化表格，方便人工比对。
    * **多表单支持**：自动提取并展示“计容面积表”、“公摊部位表”等多张关联表格。
    * **异常高亮**：系统自动标记置信度存疑的数据（红色边框提示），辅助人工快速定位问题。
    * **灵活操作**：
        * **保存修改**：仅保存当前编辑的数据草稿，不改变审核状态，方便中断作业。
        * **审核通过**：确认数据无误后，一键入库，状态变更为“已审核”，完成闭环。


* **容错机制**：支持对解析失败或卡顿的任务进行“重新解析”，支持对废弃文件进行“删除”。

### 2.3. 项目数据归档 (Data Archive)

**定位**：最终清洗完成的高质量数据台账，即“结果库”。
* **项目参数配置**：支持对每个项目的核心参数（如内部编号、宗地代码、测绘计算因子、算法版本）进行配置与保存，确保数据计算依据准确。
* **精细化台账展示**：
    * 以标准报表形式展示各楼栋的详细面积数据。
    * 包含复杂的多级表头结构（如：计容面积细分为商业、住宅、物管用房；不计容细分为社区用房等）。


* **智能核算**：系统自动计算并在底部展示面积分摊核算结果，对比“合同约定面积”与“实测面积”的差值，异常差值自动预警。
* **详情查阅（只读模式）**：点击具体工程名称，可弹窗查看该楼栋的分户明细与公用部位明细。此模式下数据**禁止修改**，确保归档数据的安全性。
* **报表导出**：支持将清洗后的汇总数据一键导出为 Excel 报表。

### 2.4. 用户权限管理 (User Management)

**定位**：系统的基础安全与人员管理模块。

* **人员列表**：管理系统内的管理员、操作员、审核员等账号信息。
* **状态控制**：支持对账号进行启用/禁用操作，查看最后登录时间。
* **安全登录**：系统具备严格的会话控制，确保未经授权无法访问业务数据。

---

## 3. 业务操作流程简述

1. **立项**：在工作台新建测绘项目。
2. **接入**：批量上传 PDF 报告或合同文件。
3. **处理**：系统自动进行 OCR 识别与 AI 数据清洗。
4. **审核**：人工进入“智能审核模式”，对照原件核修数据，点击“审核通过”。
5. **归档**：数据自动同步至“项目数据归档”模块，生成最终台账。
6. **输出**：在归档界面查阅详情、配置参数或导出最终报表。


<el-empty v-else-if="fileTableData.length === 0" description="该项目暂无文件，请点击右上角上传" :image-size="120" />



// 替换原有openCalibration函数
const openCalibration = async (row) => {
  currentFile.value = row
  showCalibration.value = true
  calibrationLoading.value = true
  calibrationPdfUrl.value = ''
  preprocessGridfsId.value = row.preprocessGridfsId || '';
  // 重置预览类型为原始文件（默认）
  currentViewType.value = 'original';

  try {
   
    // const pdfRes = await axios.get(`/api/file/download/gridfs/${row.fileId}`, {
    //   responseType: 'blob'  // 强制后端返回Blob（二进制文件）
    // })
    // 生成本地Blob URL（浏览器本地临时URL，可直接渲染）
    const initialPdfUrl = await getPdfBlobUrl(row.fileId);
    if (initialPdfUrl) {
      calibrationPdfUrl.value = initialPdfUrl;
    } else {
      ElMessage.warning('原始文件预览失败');
    }
    

    // 2. 调用户室面积接口（去掉 rawTableData 汇总逻辑，直接初始化汇总为 0.00）
    if (!currentProject.value || !row.rawId) { // 用 currentProject 直接替代（你已定义）
      ElMessage.warning('缺少项目/报告ID，无法加载户室数据')
      return
    }
    // 初始化汇总数据（无 rawTableData，直接设为 0.00）
    roomSumInfo.buildingAreaSum = '0.00'
    roomSumInfo.innerAreaSum = '0.00'
    roomSumInfo.balconyAreaSum = '0.00'
    roomSumInfo.sharedAreaSum = '0.00'

    // 3. 请求户室面积数据（保留核心逻辑）
    const res = await axios.get(`/api/project/${currentProject.value}/survey-reports/${row.rawId}/room-info`)
    console.log(currentProject.value, row.rawId, '户室面积接口响应：')
    if (res.data.code === 200 && Array.isArray(res.data.data)) {
      roomInfoData.value = res.data.data.map(item => ({
        id: item.id,
        roomLevel: item.roomLevel || '-',
        roomNumber: item.roomNumber || '-',
        buildingArea: (item.buildingArea || 0).toFixed(2),
        innerArea: (item.innerArea || 0).toFixed(2),
        balconyArea: (item.balconyArea || 0).toFixed(2),
        sharedArea: (item.sharedArea || 0).toFixed(2),
        isCalculate: item.isCalculate || 0,
        usageCategory: usageCategoryMap[item.usageCategory] || '未知',
        roomUsage: item.roomUsage || '-',
        floorAreaType: item.floorAreaType === 'BUILDABLE' ? '计容' : '不计容'
      }));
    } else {
      roomInfoData.value = []
      ElMessage.warning('暂无户室面积数据')
    }
    // ===== 新增：补全合计数据拉取 + 匹配 + 赋值 =====
    const summaryRes = await axios.get(`/api/project/${currentProject.value}/survey-reports/parsed`);
    if (summaryRes.data.code === 200 && Array.isArray(summaryRes.data.data)) {
      const surveyList = summaryRes.data.data;
      // 关键：匹配当前文件对应的报告数据
      const currentSummary = surveyList.find(item => item.id === row.rawId);
      
      if (currentSummary) {
        // 1. 赋值需求字段（精准映射）
        auditSummaryData.pendingConfirmArea = (currentSummary.pendingConfirmArea || 0).toFixed(2);
        auditSummaryData.unknownUsages = currentSummary.unknownUsages || '[]';
        auditSummaryData.unknownUsageCount = currentSummary.unknownUsageCount || 0;
        auditSummaryData.isVerified = currentSummary.isVerified || 0;
        auditSummaryData.hasUnknownUsage = currentSummary.hasUnknownUsage || 0;
        auditSummaryData.verificationErrorReason = currentSummary.verificationErrorReason || '-';
        auditSummaryData.roomInfoBuildingAreaSum = (currentSummary.roomInfoBuildingAreaSum || 0).toFixed(2);
        auditSummaryData.roomInfoInnerAreaSum = (currentSummary.roomInfoInnerAreaSum || 0).toFixed(2);
        auditSummaryData.roomInfoBalconyAreaSum = (currentSummary.roomInfoBalconyAreaSum || 0).toFixed(2);
        auditSummaryData.roomInfoSharedAreaSum = (currentSummary.roomInfoSharedAreaSum || 0).toFixed(2);
         // 2. 新增赋值OCR机器识别字段
        auditSummaryData.roomInfoBuildingAreaSumFromOcr = (currentSummary.roomInfoBuildingAreaSumFromOcr || 0).toFixed(2);
        auditSummaryData.roomInfoInnerAreaSumFromOcr = (currentSummary.roomInfoInnerAreaSumFromOcr || 0).toFixed(2);
        auditSummaryData.roomInfoBalconyAreaSumFromOcr = (currentSummary.roomInfoBalconyAreaSumFromOcr || 0).toFixed(2);
        auditSummaryData.roomInfoSharedAreaSumFromOcr = (currentSummary.roomInfoSharedAreaSumFromOcr || 0).toFixed(2);
              
        // 2. 可选：如果接口返回的 roomInfo 汇总为空，从户室数据手动汇总（兜底）
        if (!currentSummary.roomInfoBuildingAreaSum && roomInfoData.value.length > 0) {
          const buildingAreaTotal = roomInfoData.value.reduce((sum, item) => sum + Number(item.buildingArea), 0);
          auditSummaryData.roomInfoBuildingAreaSum = buildingAreaTotal.toFixed(2);
          // 其他面积汇总同理，可按需补充
        }
      } else {
        ElMessage.warning('未找到当前报告的合计数据');
        // 重置合计数据为默认值（避免残留旧数据）
        Object.assign(auditSummaryData, {
          pendingConfirmArea: '0.00',
          unknownUsageCount: 0,
          verificationErrorReason: '-',
          roomInfoBuildingAreaSum: '0.00'
        });
      }
    }
  } catch (error) {
    ElMessage.error('文件详情加载失败')
  } finally {
    calibrationLoading.value = false
  }
}



 // 3.2 加载合计数据（★ 核心修改：用新 POST 接口 /query 替换原有 /parsed 接口 ★）
  try {
    const summaryRes = await axios.post(
      `/api/project/${currentProject.value}/survey-reports/query`, // 新接口地址
      { fileRecordId: row.rawId } // POST 请求参数：fileRecordId 赋值为 row.rawId
    );
    console.log(row.rawId, '汇总数据接口响应：', summaryRes.data)
    
    if (summaryRes.data.code === 200 && Array.isArray(summaryRes.data.data.records) && summaryRes.data.data.records.length > 0) {
      // 直接取 records[0]，无需遍历匹配（接口返回 total: 1，只有一条数据）
      const currentSummary = summaryRes.data.data.records[0];
      
      if (currentSummary) {
        // 赋值原有字段（含OCR），数据直接从 currentSummary 提取，无需 find 匹配
        auditSummaryData.pendingConfirmArea = (currentSummary.pendingConfirmArea || 0).toFixed(2);
        auditSummaryData.unknownUsages = currentSummary.unknownUsages || '[]';
        auditSummaryData.unknownUsageCount = currentSummary.unknownUsageCount || 0;
        auditSummaryData.isVerified = currentSummary.isVerified || 0;
        auditSummaryData.hasUnknownUsage = currentSummary.hasUnknownUsage || 0;
        auditSummaryData.verificationErrorReason = currentSummary.verificationErrorReason || '-';
        auditSummaryData.roomInfoBuildingAreaSum = (currentSummary.roomInfoBuildingAreaSum || 0).toFixed(2);
        auditSummaryData.roomInfoInnerAreaSum = (currentSummary.roomInfoInnerAreaSum || 0).toFixed(2);
        auditSummaryData.roomInfoBalconyAreaSum = (currentSummary.roomInfoBalconyAreaSum || 0).toFixed(2);
        auditSummaryData.roomInfoSharedAreaSum = (currentSummary.roomInfoSharedAreaSum || 0).toFixed(2);
        // OCR字段赋值
        auditSummaryData.roomInfoBuildingAreaSumFromOcr = (currentSummary.roomInfoBuildingAreaSumFromOcr || 0).toFixed(2);
        auditSummaryData.roomInfoInnerAreaSumFromOcr = (currentSummary.roomInfoInnerAreaSumFromOcr || 0).toFixed(2);
        auditSummaryData.roomInfoBalconyAreaSumFromOcr = (currentSummary.roomInfoBalconyAreaSumFromOcr || 0).toFixed(2);
        auditSummaryData.roomInfoSharedAreaSumFromOcr = (currentSummary.roomInfoSharedAreaSumFromOcr || 0).toFixed(2);
        
        // 兜底逻辑：如果接口返回的汇总面积为空，用户室数据计算总和
        if (!currentSummary.roomInfoBuildingAreaSum && roomInfoData.value.length > 0) {
          const buildingAreaTotal = roomInfoData.value.reduce((sum, item) => sum + Number(item.buildingArea), 0);
          auditSummaryData.roomInfoBuildingAreaSum = buildingAreaTotal.toFixed(2);
        }
      } else {
        ElMessage.warning('未找到当前报告的合计数据');
      }
    } else {
      ElMessage.warning('汇总数据接口返回格式异常');
      // 数据兜底，避免页面出现空值
      Object.assign(auditSummaryData, {
        pendingConfirmArea: '0.00',
        unknownUsageCount: 0,
        verificationErrorReason: '-',
        roomInfoBuildingAreaSum: '0.00'
      });
    }
  } catch (error) {
    ElMessage.warning('汇总数据加载失败');
    console.error('汇总数据接口请求异常：', error);
    // 数据兜底，避免页面出现空值
    Object.assign(auditSummaryData, {
      pendingConfirmArea: '0.00',
      unknownUsageCount: 0,
      verificationErrorReason: '-',
      roomInfoBuildingAreaSum: '0.00'
    });
  }


  <div class="pdf-canvas" style="height: calc(100% - 48px); overflow: hidden;">
              <!-- 新增PDF loading提示 -->
              <div v-if="pdfLoading" style="display: flex; justify-content: center; align-items: center; height: 100%; color: #fff;">
                <el-icon size="32" color="#fff"><Loading /></el-icon>
                <span style="margin-left: 10px;">正在加载PDF文件...</span>
              </div>
             <iframe 
              v-if="calibrationPdfUrl" 
              :src="calibrationPdfUrl" 
              style="width:100%; height:100%; border:none;"
              @load="pdfLoaded"
              @error="pdfLoadError"
             ></iframe>
             <div v-else style="display: flex; justify-content: center; align-items: center; height: 100%; color: #ccc;">
                <span>PDF文件加载失败</span>
             </div>
          </div>



const loadRecognitionMd = async (fileRecordId) => {
  if (!fileRecordId) {
    recognitionMdContent.value = '# 缺少文件记录ID，无法加载识别内容';
    return;
  }

  recognitionMdLoading.value = true;
  try {
    const res = await axios.post(
      '/api/data-tables/ocr-execution-results/query',
      {
        fileRecordId: fileRecordId,
        pageNum: 1,
        pageSize: 20,
        sortField: 'createTime',
        sortDirection: 'desc'
      }
    );

    if (res.data.code === 200 && Array.isArray(res.data.data.records) && res.data.data.records.length > 0) {
      const ocrResult = res.data.data.records[0];
      let mdContent = ocrResult.markdownContent || '# 暂无识别内容（MD格式）';
      
      // ===== 核心：替换 img 的 src 相对路径为完整路径 =====
      // 1. 定义后端图片访问基础接口（关键！需要你替换为实际的后端图片下载接口）
      // 示例：如果后端提供 /api/file/download/imgs/xxx.jpg 来访问图片，就写这个路径
      const imgBaseUrl = '/api/file/download/imgs/'; // 替换为你的实际后端图片接口
      
      // 2. 正则替换：把所有 src="imgs/xxx.jpg" 替换为 src="imgBaseUrl/xxx.jpg"
      mdContent = mdContent.replace(/src=["']imgs\/([^"']+)["']/gi, (match, imgName) => {
        return `src="${imgBaseUrl}${imgName}"`;
      });
      
      // ===== 原有打印日志（会同步显示替换后的img标签和src） =====
      const imgTagReg = /<img[^>]*>/gi;
      const imgTags = mdContent.match(imgTagReg) || [];
      
      console.log('📷 原始MD（替换路径后）中的所有img标签：');
      if (imgTags.length > 0) {
        imgTags.forEach((imgTag, index) => {
          console.log(`  第${index+1}个img：`, imgTag);
          const srcReg = /src=["']([^"']+)["']/i;
          const srcMatch = imgTag.match(srcReg);
          const imgSrc = srcMatch ? srcMatch[1] : '无src地址';
          console.log(`  对应src地址：`, imgSrc);
        });
      } else {
        console.log('  未提取到任何img标签');
      }
      
      // 3. 赋值给响应式变量，用于渲染
      recognitionMdContent.value = mdContent;
    } else {
      recognitionMdContent.value = '# 未查询到OCR识别结果';
    }
  } catch (error) {
    console.error('MD 内容加载失败：', error);
    recognitionMdContent.value = `# 加载失败：${error.message || '网络异常'}`;
  } finally {
    recognitionMdLoading.value = false;
  }
};


const handleRealUpload = () => {
  if (!currentProject.value) return ElMessage.warning('请先选择作业项目')
  if (tempFiles.value.length === 0) return ElMessage.warning('请至少选择一个文件')

  // const loadingInstance = ElMessage({
  //   message: '正在上传文件，请稍候...',
  //   type: 'info',
  //   icon: Loading,
  //   duration: 0,
  // })


  // 1. 先给用户“任务提交成功”的提示（替代之前的无限loading）
  ElMessage.success(`上传任务已提交！${tempFiles.value.length} 个文件正在后台处理，可继续上传其他文件~`);

  // 2. 立即关闭弹窗、清空文件列表（核心：释放用户操作，不让用户等）
  uploadDialogVisible.value = false;
  tempFiles.value = [];
  if (uploadRef.value) uploadRef.value.clearFiles();

  const formData = new FormData()
  tempFiles.value.forEach(file => {
    formData.append('files', file.raw) 
  })

  axios.post('/api/file/batch-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    params: {
      projectId: currentProject.value,
      fileContextType: tempUploadType.value, 
      phase: tempUploadType.value === 'SURVEY_REPORT' ? uploadPhase.value : undefined
    }
  })
  .then(res => {
    loadingInstance.close()

    if (res.data.code === 200) {
      ElMessage.success(`成功上传 ${tempFiles.value.length} 个文件！`)
      refreshData()
      uploadDialogVisible.value = false
      // 关闭后会自动触发 @closed 事件清理文件列表
    } else {
      ElMessage.error(res.data.msg || '上传失败，服务器返回错误')
    }
  })
  .catch(err => {
    // loadingInstance.close()
    
    console.error('上传出错:', err)
    ElMessage.error('上传超时或网络连接失败')
  })
}


// 轮询检查
// const checkPolling = (list) => {
//   const hasPending = list.some(item => ['UPLOADING','PENDING', 'PARSING'].includes(item.status))
  
//   // 启动分支（不变，确保正确）
//   if (hasPending && !pollingTimer.value) {
//     pollingTimer.value = setInterval(() => {
//       refreshDataSilent()
//     }, 3000)
//     console.log('✅ 轮询启动：存在处理中文件')
//   } 
//   // 停止分支（关键修复：所有操作都针对 pollingTimer.value）
//   else if (!hasPending && pollingTimer.value) {
//     // 1. 清除定时器实例（必须传 .value）
//     clearInterval(pollingTimer.value)
//     // 2. 重置定时器状态为 null（必须传 .value）
//     pollingTimer.value = null
//     console.log('✅ 轮询停止：无处理中文件，pollingTimer.value 已设为 null')
//   }
  
//   // 新增打印：直观看到状态（方便你调试）
//   console.log('📌 当前轮询状态：', {
//     hasPending: hasPending,
//     pollingTimerValue: pollingTimer.value,
//     isPollingRunning: !!pollingTimer.value
//   })
// }

// 静默刷新 (不转圈)
// 静默刷新（轮询专用：查全部文件，不考虑筛选/分页，只为判断轮询是否停止）
// const refreshDataSilent = async () => {
//   if (!currentProject.value) return
//   const pid = currentProject.value
//   try {
//     // 关键：轮询时，只传 projectId，去掉所有筛选、分页参数，拿到全部文件
//     const queryParams = {
//       projectId: pid,
//       originalName: null, // 不筛选文件名
//       fileContextType: null, // 不筛选文件类型
//       fileState: null, // 不筛选状态（关键：拿到所有状态的文件）
//       pageNum: 1, // 固定第 1 页
//       pageSize: 9999 // 每页足够大，确保拿到所有文件（避免分页遗漏）
//     }
//     const res = await axios.post('/api/file/query', queryParams)

//     if (res.data.code === 200 && res.data.data?.records) {
//       const newList = res.data.data.records
//       total.value = res.data.data.total || 0 
      
//       // 1. 局部更新：更新前端显示列表的对应行状态（不影响用户看到的筛选结果）
//       newList.forEach(newItem => {
//         const oldItem = fileTableData.value.find(item => item.rawId === newItem.id)
//         if (oldItem) {
//           oldItem.status = newItem.fileState || oldItem.status
//           oldItem.errorMessage = newItem.parseMessage || oldItem.errorMessage
//         }
//       })
      
//       // 2. 关键：用「全部文件列表」判断轮询，确保 !hasPending 能正确触发
//       checkPolling(newList); // 直接传递后端返回的全部文件列表，不是前端筛选后的列表
//     }
//   } catch(e) {
//     console.error('静默刷新文件状态失败：', e)
//   }
// }
// onMounted(() => {
//   fetchProjectList()
// })

// onMounted(() => {
//   const savedProjectId = localStorage.getItem('savedCurrentProject')
//   if (savedProjectId) {
//     currentProject.value = savedProjectId
//     refreshData() // 自动请求该项目的文件列表
//   }
// })



<el-table 
                  :data="roomInfoData" 
                  border 
                  size="small"
                  v-loading="roomInfoLoading"
                  element-loading-text="加载户室数据中..."
                  style="width: 100%; height: 100%;"
                >
                  <el-table-column label="序号" type="index" width="60" align="center" :index="index => index + 1" />
                  <el-table-column prop="roomLevel" label="楼层" width="80" align="center" />
                  <el-table-column prop="roomNumber" label="房号" width="100" align="center" />
                  <el-table-column prop="buildingArea" label="建筑面积(㎡)" width="120" align="center" />
                  <el-table-column prop="innerArea" label="套内面积(㎡)" width="120" align="center" />
                  <el-table-column prop="balconyArea" label="阳台面积(㎡)" width="120" align="center" />
                  <el-table-column prop="sharedArea" label="分摊面积(㎡)" width="120" align="center" />
                  <el-table-column prop="isCalculate" label="是否计算" width="100" align="center">
                    <template #default="{ row }">
                      <span>{{ row.isCalculate === 1 ? '是' : '否' }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column prop="usageCategory" label="用途类别" width="120" align="center" />
                  <el-table-column prop="roomUsage" label="用途" min-width="100" show-overflow-tooltip align="center"  />
                  <el-table-column prop="floorAreaType" label="面积类型" width="80" align="center">
                    <template #default="{ row }">
                      <el-tag :type="row.floorAreaType === '计容' ? 'success' : 'info'" size="small">
                        {{ row.floorAreaType }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>