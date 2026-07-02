import { ref, reactive } from 'vue'
import { ElMessage } from 'element-plus'
import { getProjectList, createProject } from '@/services/project.service'

export function useProjectOptions() {
  const projectOptions = ref([])
  const currentProject = ref('')
  const showCreateProject = ref(false)

  const newProjectForm = reactive({
    projectName: '',
    projectTime: ''
  })

  const fetchProjectList = async () => {
    try {
      const res = await getProjectList()
      if (res.data.code === 200) {
        projectOptions.value = res.data.data.map((item) => ({
          id: String(item.id),
          name: item.projectName
        }))
      }
    } catch (error) {
      console.error('获取项目列表失败', error)
    }
  }

  const handleCreateProject = () => {
    if (!newProjectForm.projectName) return ElMessage.warning('请输入项目名称')
    if (!newProjectForm.projectTime) return ElMessage.warning('请选择项目时间（ISO 自然日，如 2025-11-15）')

    const loadingInstance = ElMessage({
      message: '正在创建项目...',
      type: 'info',
      duration: 0
    })

    createProject(newProjectForm.projectName, newProjectForm.projectTime)
      .then((res) => {
        loadingInstance.close()
        if (res.data.code === 200) {
          ElMessage.success('项目创建成功！')
          const newId = String(res.data.data ? res.data.data.id : Date.now())
          projectOptions.value.push({
            id: newId,
            name: newProjectForm.projectName
          })
          currentProject.value = newId
          showCreateProject.value = false
          newProjectForm.projectName = ''
          newProjectForm.projectTime = ''
        } else {
          ElMessage.error(res.data.msg || '创建失败，请重试')
        }
      })
      .catch((err) => {
        loadingInstance.close()
        console.error(err)
        ElMessage.error('网络错误或服务器异常')
      })
  }

  return {
    projectOptions,
    currentProject,
    showCreateProject,
    newProjectForm,
    fetchProjectList,
    handleCreateProject
  }
}

