import { ElMessage } from 'element-plus'
import { deleteFileById, queryFiles } from '@/services/file.service'

export function useFileListActions({ currentProject, refreshData }) {
  const deleteFile = (row) => {
    deleteFileById(row.rawId)
      .then((res) => {
        if (res.data.code === 200) {
          ElMessage.success('文件及相关数据已完全删除')
          refreshData()
        } else {
          ElMessage.error(res.data.msg || '删除失败')
        }
      })
      .catch((err) => {
        console.error('删除出错:', err)
        ElMessage.error('删除文件失败，请稍后重试')
      })
  }

  const checkBatchStatus = async (options) => {
    return await queryFiles(
      {
        projectId: currentProject.value,
        originalName: null,
        fileContextType: null,
        fileState: null,
        pageNum: 1,
        pageSize: 9999
      },
      { signal: options.signal }
    )
  }

  return {
    deleteFile,
    checkBatchStatus
  }
}
