<script setup lang="ts">
import { ref } from 'vue'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Icon from '@/components/ui/Icon.vue'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'
import DataEditor from '../components/DataEditor.vue'
import TransferManager from '../components/TransferManager.vue'
import HealthMonitor from '../components/HealthMonitor.vue'

const router = useRouter()
const activeTab = ref('editor')

function goBack() {
  router.push('/settings')
}
</script>

<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex items-center gap-2">
      <Button variant="ghost" size="icon" @click="goBack" class="-ml-2">
        <Icon name="ArrowLeftIcon" :size="20" />
      </Button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">데이터 고급 관리</h1>
        <p class="text-muted-foreground">데이터 조회, 수정, 백업 및 무결성 검사를 수행합니다.</p>
      </div>
    </div>

    <Tabs v-model="activeTab" class="space-y-4">
      <TabsList>
        <TabsTrigger value="editor" class="flex items-center gap-2">
          <Icon name="TableCellsIcon" :size="16" />
          데이터 뷰어/수정
        </TabsTrigger>
        <TabsTrigger value="io" class="flex items-center gap-2">
          <Icon name="ArrowDownTrayIcon" :size="16" />
          가져오기/내보내기
        </TabsTrigger>
        <TabsTrigger value="health" class="flex items-center gap-2">
          <Icon name="HeartIcon" :size="16" />
          데이터 검사
        </TabsTrigger>
      </TabsList>

      <!-- Editor Tab -->
      <TabsContent value="editor" class="focus-visible:outline-none">
        <Card>
          <CardHeader>
            <CardTitle>주차 데이터 에디터</CardTitle>
            <CardDescription>
              주차별 배정 데이터를 JSON 형식으로 직접 조회하고 수정합니다.
              <span class="text-destructive font-medium">주의: 저장 버튼을 누르면 DB에 즉시 반영됩니다.</span>
            </CardDescription>
          </CardHeader>
          <CardContent class="p-0 sm:p-6">
            <DataEditor />
          </CardContent>
        </Card>
      </TabsContent>

      <!-- I/O Tab -->
      <TabsContent value="io" class="focus-visible:outline-none">
        <TransferManager />
      </TabsContent>

      <!-- Health Tab -->
      <TabsContent value="health" class="focus-visible:outline-none">
        <HealthMonitor />
      </TabsContent>
    </Tabs>
  </div>
</template>
